import { Pool, PoolClient, PoolConfig, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { patchQuery } from './explain';
import { sql } from './sql';
import { IsolationLevel, PoolWrapper, RawSql, Transaction } from './types';

type PoolOrConfig = Pool | PoolConfig | string;

export class Pg implements PoolWrapper {
    private nodes;

    public master;
    public replicas;
    public meta: Record<string, unknown> = {};

    public connectUnsafe;
    public transaction;
    public connect;
    public query;
    public sql;

    public get pg() {
        return this;
    }

    public constructor({
        applicationName,
        master,
        replicas = [],
    }: {
        applicationName?: string;
        master: PoolOrConfig;
        replicas?: PoolOrConfig[];
    }) {
        this.master = new PooledPg(this, { applicationName, pool: master });
        this.replicas = replicas.map((x) => new PooledPg(this, { applicationName, pool: x }));
        this.nodes = [this.master, ...this.replicas];

        this.connectUnsafe = this.master.connectUnsafe;
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
        await Promise.all(this.nodes.map((x) => x.close()));
    };

    public static enableSlowExplainNotSuitableForProduction = (logger: {
        debug: (message: string, meta?: unknown) => void;
    }) => {
        patchQuery(logger);
    };
}

class PooledPg implements PoolWrapper {
    public pool;
    private isPoolExternal;
    private options;

    public constructor(
        public pg: Pg,
        {
            applicationName,
            pool,
            onPoolError,
            onClientError,
        }: {
            applicationName?: string;
            pool: PoolOrConfig;
            onPoolError?: (error: Error) => void;
            onClientError?: (error: Error) => void;
        },
    ) {
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
    public get pg() {
        return this.pool.pg;
    }

    public constructor(private pool: PooledPg, private options?: { isolationLevel?: IsolationLevel }) {}

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
        this.client = await this.pool.connectUnsafe();
        await this.client.query(this.getTransactionBegin(this.options?.isolationLevel));

        return this.client;
    };

    private getTransactionBegin = (level?: IsolationLevel) => {
        if (!level || level === 'READ COMMITTED') {
            return 'BEGIN';
        }

        return `BEGIN ISOLATION LEVEL ${level}`;
    };
}
