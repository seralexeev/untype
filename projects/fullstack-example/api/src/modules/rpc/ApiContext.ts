import { Transaction } from '@untype/pg';
import { Request, Response } from 'express';
import { ApiUser } from './ApiUser';

export type ApiContext = {
    t: Transaction;
    auth: ApiUser;
    req: Request;
    res: Response;
};
