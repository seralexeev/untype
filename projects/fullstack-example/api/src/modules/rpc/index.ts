import { createEndpointFactory } from '@untype/rpc';
import { ApiExecutor } from './ApiExecutor';

export const { rpc, rest } = createEndpointFactory(ApiExecutor);
