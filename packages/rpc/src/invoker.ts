import { IncomingMessage, OutgoingMessage } from 'node:http';

import { Class } from '@untype/core';

import { Endpoint, EndpointConfig } from './endpoint';
import { EndpointResponse, JsonResponse } from './response';

export type HttpContext = { req: IncomingMessage; res: OutgoingMessage };

export type InvokeArgs<TContext, TAuth> = {
    resolve: (ctx: Omit<TContext, 'auth'>) => unknown;
    input: unknown;
    auth: TAuth;
    req: IncomingMessage;
    res: OutgoingMessage;
    config: Endpoint<unknown, unknown>['config'];
    endpoint: string;
};

export abstract class ControllerInvoker<TContext, TAuth> {
    public abstract invoke({ resolve }: InvokeArgs<TContext, TAuth>): Promise<unknown>;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async auth(ctx: HttpContext): Promise<TAuth | null> {
        return null;
    }

    protected rpc = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: EndpointConfig<TContext, TAuth, TInput, TOutput, TAnonymous>,
    ): Endpoint<TInput, TOutput> => new Endpoint<TInput, TOutput>('RPC', this, config);

    protected rest = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: EndpointConfig<TContext, TAuth, TInput, TOutput, TAnonymous>,
    ): Endpoint<TInput, TOutput> => new Endpoint<TInput, TOutput>('REST', this, config);

    public async onRawOutput(output: unknown): Promise<EndpointResponse> {
        return new JsonResponse({ data: output });
    }
}

export const createEndpointFactory = <TContext, TAuth>(Invoker: Class<ControllerInvoker<TContext, TAuth>>) => {
    const rpc = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: EndpointConfig<TContext, TAuth, TInput, TOutput, TAnonymous>,
    ) => new Endpoint<TInput, TOutput>('RPC', Invoker, config);

    const rest = <TInput, TOutput, TAnonymous extends true | undefined>(
        config: EndpointConfig<TContext, TAuth, TInput, TOutput, TAnonymous>,
    ) => new Endpoint<TInput, TOutput>('REST', Invoker, config);

    return { rpc, rest };
};

export abstract class SimpleInvoker<TAuth = true> extends ControllerInvoker<{}, TAuth> {
    public override invoke = async ({ resolve }: InvokeArgs<{}, TAuth>) => resolve({});
}
