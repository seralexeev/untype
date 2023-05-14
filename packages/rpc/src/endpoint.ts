import { Class, Merge, OmitNever } from '@untype/core';
import { z } from 'zod';

import { Jsonify } from 'type-fest';
import { ControllerInvoker } from './invoker';

type InvokerType = ControllerInvoker<any, any> | Class<ControllerInvoker<any, any>>;

export class RpcEndpoint<TInput, TOutput> {
    public type = 'RPC' as const;

    public constructor(
        public Invoker: InvokerType,
        public config: {
            input?: TInput;
            output?: z.ZodType<TOutput>;
            anonymous?: boolean;
            resolve: (args: any) => unknown;
        },
    ) {}
}

export class RestEndpoint<TInput, TOutput> {
    public type = 'REST' as const;

    public constructor(
        public Invoker: InvokerType,
        public config: {
            input?: z.ZodType<TInput>;
            output?: z.ZodType<TOutput>;
            anonymous?: boolean;
            resolve: (args: any) => unknown;
        },
    ) {}
}

type InferZod<T> = T extends z.ZodType ? z.infer<T> : never;

type ResolveCallback<TContext, TAuth, TInput, TOutput, TAnonymous> = (args: {
    input: TInput;
    ctx: undefined extends TAnonymous ? TContext & { auth: TAuth } : TContext & { auth: TAuth | null };
}) => Promise<TOutput> | TOutput;

export type EndpointConfig<TContext, TAuth, TInput, TOutput, TAnonymous> = {
    input?: TInput extends z.ZodType ? TInput : never;
    output?: z.ZodType<TOutput>;
    anonymous?: TAnonymous;
    resolve: ResolveCallback<TContext, TAuth, InferZod<TInput>, TOutput, TAnonymous>;
    description?: string;
    summary?: string;
};

export type RpcApi<T> = Merge<
    { [K in keyof T]: T[K] extends Class<any> ? RpcControllerApi<InstanceType<T[K]>> : never }[keyof T]
>;

type RpcControllerApi<T> = OmitNever<{
    [K in keyof T]: T[K] extends RpcEndpoint<infer TInput, infer TOutput>
        ? TInput extends z.ZodType<any, any, infer Q>
            ? { output: Jsonify<TOutput>; input: Q }
            : { output: Jsonify<TOutput> }
        : never;
}>;
