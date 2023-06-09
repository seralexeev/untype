import { Class, Merge, OmitNever } from '@untype/core';
import { Jsonify } from 'type-fest';
import { z } from 'zod';
import { EndpointExecutor } from './executor';

export class Endpoint<TInput, TOutput> {
    public constructor(
        public type: 'RPC' | 'REST',
        public Executor: EndpointExecutor<any, any, any, any, any> | Class<EndpointExecutor<any, any, any, any, any>>,
        public config: EndpointConfig<any, any, any, any, TInput, TOutput, any>,
    ) {}
}

export type EndpointConfig<TRequest, TResponse, TContext, TUser, TInput, TOutput, TAnonymous extends true | undefined> = {
    input?: TInput extends z.ZodType ? TInput : never;
    output?: z.ZodType<TOutput>;
    anonymous?: TAnonymous;
    resolve: (args: {
        input: TInput extends z.ZodType ? z.infer<TInput> : never;
        ctx: TContext & { user: undefined extends TAnonymous ? TUser : TUser | null };
        params: Record<string, string>;
        query: Record<string, string>;
        req: TRequest;
        res: TResponse;
    }) => Promise<TOutput> | TOutput;
};

export type RpcApi<T> = Merge<{ [K in keyof T]: T[K] extends Class<infer Q> ? RpcControllerApi<Q> : never }[keyof T]>;

type RpcControllerApi<T> = OmitNever<{
    [K in keyof T]: T[K] extends Endpoint<infer TInput, infer TOutput>
        ? TInput extends z.ZodType<any, any, infer Q>
            ? { output: Jsonify<TOutput>; input: Q }
            : { output: Jsonify<TOutput> }
        : never;
}>;
