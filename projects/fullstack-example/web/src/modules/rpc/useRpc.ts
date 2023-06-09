import { Api } from '@untype/fullstack-example-api';
import { createRpcHook } from '@untype/rpc-react';

export const { useRpc, useInvalidate, useReset } = createRpcHook<Api>({ path: '/api' });
