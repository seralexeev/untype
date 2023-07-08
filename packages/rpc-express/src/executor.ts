import { Executor } from '@untype/rpc';
import { Request, Response } from 'express';

export abstract class ExpressExecutor<
    TApiContext extends Record<string, unknown>,
    TApiUser,
    TEndpointConfig extends Record<string, unknown> = {},
> extends Executor<Request, Response, TApiContext, TApiUser, TEndpointConfig> {
    constructor() {
        super();
    }
}
