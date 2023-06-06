import { Transaction } from '@untype/pg';
import { Request, Response } from 'express';

export type ApiContext = {
    t: Transaction;
    req: Request;
    res: Response;
};
