import { PoolClient } from 'pg';
import { Pg } from './pg';

export type RawSql = <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T[]>;

export type QueryInterface = {
    pg: Pg;
    sql: RawSql;
    connect: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
};

export interface PoolWrapper extends QueryInterface {
    transaction: <T>(fn: (t: Transaction) => Promise<T>, options?: { isolationLevel?: IsolationLevel }) => Promise<T>;
}

export interface Transaction extends QueryInterface {
    isTransaction: true;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
}

export type SqlClient = PoolWrapper | Transaction;

export const isTransaction = (value: unknown): value is Transaction => {
    return value != null && typeof value === 'object' && 'isTransaction' in value && value.isTransaction === true;
};

export type IsolationLevel = 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
