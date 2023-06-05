import { Class, Merge, OmitNever } from '@untype/core';
import { Jsonify } from 'type-fest';
import { z } from 'zod';
import { EndpointExecutor } from './executor';

type ExecutorType = EndpointExecutor<any, any, any, any, any> | Class<EndpointExecutor<any, any, any, any, any>>;

export class Endpoint<TInput, TOutput> {
    public constructor(
        public type: 'RPC' | 'REST',
        public Executor: ExecutorType,
        public config: EndpointConfig<any, any, TInput, TOutput, any>,
    ) {}
}

type InferZod<T> = T extends z.ZodType ? z.infer<T> : never;

type ResolveCallback<TContext, TUser, TInput, TOutput, TAnonymous extends true | undefined> = (args: {
    input: TInput;
    ctx: TContext & { auth: undefined extends TAnonymous ? TUser | null : TUser };
    params: Record<string, string>;
    query: Record<string, string>;
}) => Promise<TOutput> | TOutput;

export type EndpointConfig<TContext, TUser, TInput, TOutput, TAnonymous extends true | undefined> = {
    input?: TInput extends z.ZodType ? TInput : never;
    output?: z.ZodType<TOutput>;
    anonymous?: TAnonymous;
    resolve: ResolveCallback<TContext, TUser, InferZod<TInput>, TOutput, TAnonymous>;
};

export type RpcApi<T> = Merge<
    { [K in keyof T]: T[K] extends Class<any> ? RpcControllerApi<InstanceType<T[K]>> : never }[keyof T]
>;

type RpcControllerApi<T> = OmitNever<{
    [K in keyof T]: T[K] extends Endpoint<infer TInput, infer TOutput>
        ? TInput extends z.ZodType<any, any, infer Q>
            ? { output: Jsonify<TOutput>; input: Q }
            : { output: Jsonify<TOutput> }
        : never;
}>;
