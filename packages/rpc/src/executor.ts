import { Class } from '@untype/core';
import { IncomingMessage, OutgoingMessage } from 'node:http';
import { Endpoint, EndpointConfig } from './endpoint';
import { EndpointResponse, JsonResponse } from './response';

export type InvokeArgs<TRequest, TResponse, TContext, TUser, TConfig> = {
    resolve: (ctx: Omit<TContext, 'auth'>) => unknown;
    input: unknown;
    user: TUser;
    req: TRequest;
    res: TResponse;
    config: TConfig & EndpointConfig<any, any, any, any, any>;
    endpoint: string;
};

export abstract class EndpointExecutor<
    TRequest extends IncomingMessage,
    TResponse extends OutgoingMessage,
    TContext extends {},
    TUser,
    TConfig extends {} = {},
> {
    protected types: {
        invoke: InvokeArgs<TRequest, TResponse, TContext, TUser, TConfig>;
        auth: { req: TRequest; res: TResponse };
    } = null as any;

    public abstract invoke(args: InvokeArgs<TRequest, TResponse, TContext, TUser, TConfig>): Promise<unknown>;

    public async auth(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ctx: { req: TRequest; res: TResponse },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        config: TConfig & EndpointConfig<any, any, any, any, any>,
    ): Promise<TUser | null> {
        return null;
    }

    protected rpc = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TContext, TUser, TInput, TOutput, TAnonymous>,
    ): Endpoint<TInput, TOutput> => new Endpoint<TInput, TOutput>('RPC', this, config);

    protected rest = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TContext, TUser, TInput, TOutput, TAnonymous>,
    ): Endpoint<TInput, TOutput> => new Endpoint<TInput, TOutput>('REST', this, config);

    public async onRawOutput(output: unknown): Promise<EndpointResponse> {
        return new JsonResponse({ data: output });
    }
}

export const createEndpointFactory = <
    TRequest extends IncomingMessage,
    TResponse extends OutgoingMessage,
    TContext extends {},
    TUser,
    TConfig extends {},
>(
    Executor: Class<EndpointExecutor<TRequest, TResponse, TContext, TUser, TConfig>>,
) => {
    const rpc = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TContext, TUser, TInput, TOutput, TAnonymous>,
    ) => new Endpoint<TInput, TOutput>('RPC', Executor, config);

    const rest = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: TConfig & EndpointConfig<TContext, TUser, TInput, TOutput, TAnonymous>,
    ) => new Endpoint<TInput, TOutput>('REST', Executor, config);

    return { rpc, rest };
};
