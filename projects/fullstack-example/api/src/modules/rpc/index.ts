import { createEndpointFactory } from '@untype/rpc';
import { ApiInvoker } from './ApiInvoker';

export const { rpc, rest } = createEndpointFactory(ApiInvoker);
