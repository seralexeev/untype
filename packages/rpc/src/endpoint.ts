import { Class, Merge, OmitNever } from '@untype/core';
import { Jsonify } from 'type-fest';
import { z } from 'zod';
import { ControllerInvoker } from './invoker';

type InvokerType = ControllerInvoker<any, any> | Class<ControllerInvoker<any, any>>;

export class Endpoint<TInput, TOutput> {
    public constructor(
        public type: 'RPC' | 'REST',
        public Invoker: InvokerType,
        public config: {
            input?: TInput;
            output?: z.ZodType<TOutput>;
            anonymous?: boolean;
            resolve: (args: any) => unknown;
        },
    ) {}
}

type InferZod<T> = T extends z.ZodType ? z.infer<T> : never;

type ResolveCallback<TContext, TAuth, TInput, TOutput, TAnonymous extends true | undefined> = (args: {
    input: TInput;
    ctx: TContext & { auth: undefined extends TAnonymous ? TAuth | null : TAuth };
    params: Record<string, string>;
    query: Record<string, string>;
}) => Promise<TOutput> | TOutput;

export type EndpointConfig<TContext, TAuth, TInput, TOutput, TAnonymous extends true | undefined> = {
    input?: TInput extends z.ZodType ? TInput : never;
    output?: z.ZodType<TOutput>;
    anonymous?: TAnonymous;
    resolve: ResolveCallback<TContext, TAuth, InferZod<TInput>, TOutput, TAnonymous>;
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
