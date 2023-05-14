import { RpcApi } from '@untype/rpc';
import { InferRpcEndpoint, InferRpcInput, InferRpcOutput } from '@untype/rpc/types';
import { AuthController } from './modules/auth/AuthController';
import { ConfigController } from './modules/config/ConfigController';
import { FileController } from './modules/files/FileController';
import { TodoController } from './modules/todo/TodoController';

export const controllers = {
    AuthController,
    ConfigController,
    TodoController,
    FileController,
};

export type Api = RpcApi<typeof controllers>;
export type RpcEndpoint = InferRpcEndpoint<Api>;
export type RpcOutput<T extends RpcEndpoint> = InferRpcOutput<Api, T>;
export type RpcItemsOutput<TMethod extends RpcEndpoint> = RpcOutput<TMethod> extends { items: Array<infer A> } ? A : never;
export type RpcInput<T extends RpcEndpoint> = InferRpcInput<Api, T>;
export type SelectRpcEndpoint<T extends RpcEndpoint> = T;
export type ExpectedEndpoint<TInput, TOutput> = {
    [TKey in RpcEndpoint]: RpcInput<TKey> extends never
        ? never
        : RpcInput<TKey> extends TInput
        ? RpcOutput<TKey> extends TOutput
            ? TKey
            : never
        : never;
}[RpcEndpoint];
