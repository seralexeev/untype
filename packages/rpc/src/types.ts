export type MaybeApi = Record<string, { input: unknown; output: unknown }>;
export type InferRpcEndpoint<TApi> = keyof TApi;
export type InferRpcOutput<TApi, TMethod extends InferRpcEndpoint<TApi>> = TApi[TMethod] extends { output: infer TOutput }
    ? TOutput
    : never;
export type InferRpcInput<TApi, TMethod extends InferRpcEndpoint<TApi>> = TApi[TMethod] extends { input: infer TInput }
    ? TInput
    : never;

export type WithInputMethods<T extends MaybeApi> = {
    [K in keyof T]: T[K]['input'] extends never ? never : K;
}[keyof T];
export type WithoutInputMethods<T extends MaybeApi> = {
    [K in keyof T]: T[K]['input'] extends never ? K : never;
}[keyof T];

export type InferExpectedEndpoint<TApi, TInput, TOutput> = {
    [TKey in InferRpcEndpoint<TApi>]: InferRpcInput<TApi, TKey> extends never
        ? never
        : InferRpcInput<TApi, TKey> extends TInput
        ? InferRpcOutput<TApi, TKey> extends TOutput
            ? TKey
            : never
        : never;
}[InferRpcEndpoint<TApi>];
