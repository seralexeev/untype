import { Pool, PoolClient } from 'pg';

export type RawSql = <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T[]>;
export type PgClient = {
    pool: Pool;
    sql: RawSql;
    connect: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
    transaction: <T>(
        fn: (t: Transaction) => Promise<T>,
        options?: { isolationLevel?: IsolationLevel | undefined } | undefined,
    ) => Promise<T>;
};

export type Transaction = {
    pg: PgClient;
    connect: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
    sql: RawSql;
    isTransaction: true;
};

export type PgConnection = PgClient | Transaction;

export const isTransaction = (value: unknown): value is Transaction => {
    return value != null && typeof value === 'object' && 'isTransaction' in value;
};

export type IsolationLevel = 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
