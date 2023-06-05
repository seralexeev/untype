import { EndpointExecutor } from '@untype/rpc';
import { Request, Response } from 'express';

export abstract class ExpressExecutor<
    TApiContext extends {},
    TApiUser,
    TEndpointConfig extends {} = {},
> extends EndpointExecutor<Request, Response, TApiContext, TApiUser, TEndpointConfig> {
    constructor() {
        super();
    }
}
