export type InferRpcEndpoint<TApi> = keyof TApi;
export type InferRpcOutput<TApi, TMethod extends InferRpcEndpoint<TApi>> = TApi[TMethod] extends { output: infer TOutput }
    ? TOutput
    : never;
export type InferRpcInput<TApi, TMethod extends InferRpcEndpoint<TApi>> = TApi[TMethod] extends { input: infer TInput }
    ? TInput
    : never;
