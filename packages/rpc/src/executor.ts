import { BadRequestError, Class, InternalError, UnauthorizedError } from '@untype/core';
import { IncomingMessage, OutgoingMessage } from 'node:http';
import { Endpoint, EndpointConfig } from './endpoint';
import { EndpointResponse, JsonResponse } from './response';

type HandleArgs<TRequest, TResponse, TConfig> = {
    name: string;
    input: unknown;
    req: TRequest;
    res: TResponse;
    config: TConfig & EndpointConfig<any, any, any, any, any, any, any>;
    params: Record<string, string>;
    query: Record<string, string>;
};

type InvokeArgs<TRequest, TResponse, TUser, TConfig, TContext> = HandleArgs<TRequest, TResponse, TConfig> & {
    resolve: (ctx: TContext) => unknown;
    user: TUser | null;
};

export abstract class Executor<
    TRequest extends IncomingMessage,
    TResponse extends OutgoingMessage,
    TContext extends {},
    TUser,
    TConfig extends {} = {},
> {
    protected types: {
        invoke: InvokeArgs<TRequest, TResponse, TUser, TConfig, TContext>;
        auth: { req: TRequest; res: TResponse };
    } = null as any;

    public abstract invoke(args: InvokeArgs<TRequest, TResponse, TUser, TConfig, TContext>): Promise<unknown>;

    public async auth(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ctx: { req: TRequest; res: TResponse },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        config: TConfig & EndpointConfig<any, any, any, any, any, any, any>,
    ): Promise<TUser | null> {
        return null;
    }

    protected rpc = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TRequest, TResponse, TContext, TUser, TInput, TOutput, TAnonymous>,
    ): Endpoint<TInput, TOutput> => new Endpoint<TInput, TOutput>('RPC', this, config);

    protected rest = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TRequest, TResponse, TContext, TUser, TInput, TOutput, TAnonymous>,
    ): Endpoint<TInput, TOutput> => new Endpoint<TInput, TOutput>('REST', this, config);

    public handle = async (args: HandleArgs<TRequest, TResponse, TConfig>): Promise<EndpointResponse> => {
        const { config, params, query, req, res, name } = args;

        // auth is being called even if anonymous is true
        // it allows us to use optional user in some cases
        const user = await this.auth(args, config);
        if (!config.anonymous && !user) {
            await this.onUnauthorized(args);
        }

        let input = args.input;

        if (config.input) {
            const inputParsed = config.input.safeParse(input);
            input = inputParsed.success ? inputParsed.data : await this.onInputValidationError(inputParsed.error, args);
        }

        const result = await this.invoke({
            resolve: (ctx) => {
                return config.resolve({
                    ctx: ctx ? { ...ctx, user } : { user },
                    input,
                    query,
                    params,
                    req,
                    res,
                });
            },
            input,
            user: user as any,
            req,
            res,
            config,
            name,
            query,
            params,
        });

        let output = result;

        if (result instanceof EndpointResponse) {
            return result;
        }

        if (config.output) {
            const outputParsed = config.output.safeParse(output);
            output = outputParsed.success ? outputParsed.data : await this.onOutputValidationError(outputParsed.error, args);
        }

        return this.onRawOutput(output);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onOutputValidationError = (cause: unknown, args: HandleArgs<TRequest, TResponse, TConfig>): unknown => {
        throw new InternalError('Output Validation Error', { cause });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onInputValidationError = (cause: unknown, args: HandleArgs<TRequest, TResponse, TConfig>): unknown => {
        throw new BadRequestError('Input Validation Error', { cause });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onUnauthorized = (args: HandleArgs<TRequest, TResponse, TConfig>): unknown => {
        throw new UnauthorizedError('Unauthorized');
    };

    public onRawOutput = async (data: unknown): Promise<EndpointResponse> => {
        return new JsonResponse({ data });
    };
}

export const createEndpointFactory = <
    TRequest extends IncomingMessage,
    TResponse extends OutgoingMessage,
    TContext extends {},
    TUser,
    TConfig extends {} = {},
>(
    Executor: Class<Executor<TRequest, TResponse, TContext, TUser, TConfig>>,
) => {
    const rpc = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TRequest, TResponse, TContext, TUser, TInput, TOutput, TAnonymous>,
    ) => new Endpoint<TInput, TOutput>('RPC', Executor, config);

    const rest = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TRequest, TResponse, TContext, TUser, TInput, TOutput, TAnonymous>,
    ) => new Endpoint<TInput, TOutput>('REST', Executor, config);

    return { rpc, rest };
};
