import { Pool, PoolClient, PoolConfig, QueryConfig, QueryResult, QueryResultRow } from 'pg';

import { patchQuery } from './explain';
import { sql } from './sql';
import { IsolationLevel, PgClient, RawSql, Transaction } from './types';

type PoolOrConfig = Pool | PoolConfig | string;

export class Pg implements PgClient {
    private nodes;

    public master;
    public replicas;

    public data = {};
    public transaction;
    public connect;
    public query;
    public sql;

    public constructor({
        applicationName,
        master,
        replicas = [],
    }: {
        applicationName?: string;
        master: PoolOrConfig;
        replicas?: PoolOrConfig[];
    }) {
        this.master = new PooledPg({ applicationName, pool: master });
        this.replicas = replicas.map((x) => new PooledPg({ applicationName, pool: x }));
        this.nodes = [this.master, ...this.replicas];

        this.transaction = this.master.transaction;
        this.connect = this.master.connect;
        this.query = this.master.query;
        this.sql = this.master.sql;
    }

    public get pool() {
        return this.master.pool;
    }

    private i = 0;
    public get readonly() {
        return this.nodes[this.i++ % this.nodes.length] ?? this.master;
    }

    public close = async () => {
        for (const node of this.nodes) {
            await node.close();
        }
    };

    public static enableSlowExplainNotSuitableForProduction = (logger: {
        debug: (message: string, meta?: unknown) => void;
    }) => {
        patchQuery(logger);
    };
}

class PooledPg implements PgClient {
    public data = {};
    public pool;
    private isPoolExternal;
    private options;

    public constructor({
        applicationName,
        pool,
        onPoolError,
        onClientError,
    }: {
        applicationName?: string;
        pool: PoolOrConfig;
        onPoolError?: (error: Error) => void;
        onClientError?: (error: Error) => void;
    }) {
        this.options = { onPoolError, onClientError };

        if (pool instanceof Pool) {
            this.pool = pool;
            this.isPoolExternal = true;
        } else if (typeof pool === 'string') {
            this.pool = new Pool({ connectionString: pool, application_name: applicationName });
            this.isPoolExternal = false;
        } else {
            this.pool = new Pool({ ...pool, application_name: applicationName });
            this.isPoolExternal = false;
        }

        if (!this.isPoolExternal) {
            this.pool.on('error', this.handlePoolError);
            this.pool.on('connect', (client: PoolClient) => client.on('error', this.handleClientError));
        }
    }

    private handlePoolError = (error: Error) => {
        this.options.onPoolError?.(error);
    };

    private handleClientError = (error: Error) => {
        this.options.onClientError?.(error);
    };

    public close = async () => {
        if (this.isPoolExternal) {
            throw new Error('Pool was created outside of this instance, call pool.end() explicitly');
        }

        await this.pool.end();
    };

    public transaction = async <T>(
        fn: (t: Transaction) => Promise<T>,
        options?: { isolationLevel?: IsolationLevel },
    ): Promise<T> => {
        const t = new TransactionScope(this, options);

        try {
            const res = await fn(t);
            await t.commit();

            return res;
        } catch (error) {
            await t.rollback();
            throw error;
        } finally {
            t.release();
        }
    };

    public query = async <R extends QueryResultRow = any, I extends any[] = any[]>(
        queryTextOrConfig: string | QueryConfig<I>,
        values?: I,
    ): Promise<QueryResult<R>> => this.connect((client) => client.query(queryTextOrConfig, values));

    public connect = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
        const client = await this.pool.connect();
        try {
            return await fn(client);
        } finally {
            client.release();
        }
    };

    public connectUnsafe = () => this.pool.connect();

    public sql: RawSql = async (strings, ...values) => {
        const result = await this.query(sql(strings, ...values));

        return result.rows;
    };
}

class TransactionScope implements Transaction {
    private clientPromise?: Promise<PoolClient>;
    private client?: PoolClient;

    public readonly isTransaction = true;
    public data = {};

    public constructor(public pg: PooledPg, private options?: { isolationLevel?: IsolationLevel }) {}

    public rollback = async () => {
        if (!this.clientPromise) {
            return;
        }

        const client = await this.clientPromise;
        await client.query('ROLLBACK');
    };

    public commit = async () => {
        if (!this.clientPromise) {
            return;
        }

        const client = await this.clientPromise;
        await client.query('COMMIT');
    };

    public release = (removeClient?: boolean) => {
        this.client?.release(removeClient);
    };

    public sql: RawSql = async (strings, ...values) => {
        const result = await this.query(sql(strings, ...values));

        return result.rows;
    };

    public query = async <R extends QueryResultRow = any, I extends any[] = any[]>(
        queryTextOrConfig: string | QueryConfig<I>,
        values?: I,
    ): Promise<QueryResult<R>> => this.connect((x) => x.query(queryTextOrConfig, values));

    public connect = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
        if (!this.clientPromise) {
            this.clientPromise = this.getClientInTransaction();
        }

        return this.clientPromise.then(fn);
    };

    private getClientInTransaction = async () => {
        this.client = await this.pg.connectUnsafe();
        await this.client.query('BEGIN');

        if (this.options?.isolationLevel && this.options.isolationLevel !== 'READ COMMITTED') {
            await this.client.query(`SET TRANSACTION ISOLATION LEVEL ${this.options.isolationLevel}`);
        }

        return this.client;
    };
}
