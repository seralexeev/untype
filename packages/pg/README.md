# 🐘 untype/pg

This library serves as an essential building block providing a convenient interface for working with PostgreSQL. It also bridges other libraries such as [untype/migrations](../migrations), [untype/orm](../orm), and [untype/worker](../worker).

## Motivation

[node-postgres](https://github.com/brianc/node-postgres) is the industry standard for interacting with PostgreSQL databases from node.js. This low-level library is well-tested and has proven its reliability over time. It supports all the necessary functions for working with databases, providing a low-level interface. However, this can sometimes be less than ideal when working with application code. For instance, the library doesn't provide a user-friendly interface for executing queries in [transactions](#Transactions) or utilizing [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) for query formation. There is also often a need to support queries to replicas for load balancing or to enhance fault tolerance, which the library doesn't support out of the box.

## Installation

```bash
# npm
npm install @untype/pg

# yarn
yarn add @untype/pg

# pnpm
pnpm add @untype/pg
```

## Usage

The library provides the `Pg` class which encapsulates the handling of transactions and replicas, and offers a convenient interface for executing queries. To create an instance of the class, database connection configuration must be provided.

### The Pg Class

```typescript
import { Pg } from '@untype/pg';

const pg = new Pg({
    applicationName: 'my-app',
    master,
    replicas,
});
```

-   `applicationName` (required) is the name of the application. It's used for logging, monitoring, and debugging queries.
-   `master` (required) is the configuration for connecting to the master database. You can read more about the connection configuration in the [node-postgres documentation](https://node-postgres.com/features/connecting#programmatic). It can be either a connection string or an object.
-   `replicas` (optional) is an array of configurations for connecting to the database replicas. More details on the connection configuration can be found in the [node-postgres documentation](https://node-postgres.com/features/connecting#programmatic). It can also be either a connection string or an object.

`Pg` is a class, so it's conveniently used in conjunction with [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection) to inject into other classes. The class instance should be created at the root of the application and registered as a **singleton**. It's not recommended to create a new instance for each request.

When you are finished working with the database, you should close all connections using the `close` method. The `close` method should be called when the application, server, or test is terminated. It closes all connections to the master and replicas.

```typescript
await pg.close();
```

The `Pg` class instance provides methods for executing database queries:

-   `query` - execute a database query on the master using a connection from the connection pool.
-   `sql` - execute a database query on the master using a connection from the connection pool with [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).
-   `connect` - fetch a connection from the master connection pool. It accepts a callback to execute a database query, after which the connection is returned to the pool.
-   `transaction` - execute a database query within a transaction. It returns the query result. If an error occurs during the query execution, the transaction will be rolled back and the connection returned to the pool. If the query is successful, the transaction will be committed and the connection returned to the pool.
-   `close` - close all connections to the database.
-   `readonly` - obtain an object with the same interface as `Pg` but iterating through the replicas in turn. The master also participates in the process, so it can be used even if there are no replicas.
-   `connectUnsafe` - fetch a connection from the master connection pool. The connection won't be returned to the pool, so you need to close the connection manually after use.
-   `pool` - get the connection pool with the master.

## Executing Queries

Executing a query is straightforward and simple. To perform a query, call one of the methods: `query`, `sql`, `connect`, or `transaction`. All methods are generics and return a promise with the result of the query. In case of an error, the promise will be rejected with the error. If the query is successfully executed, the promise will be resolved with the result of the query.

### query

```typescript
const result = await pg.query('SELECT * FROM users WHERE id = $1', [1]);
const result = await pg.query<{ id: string; name: string }>('SELECT * FROM users WHERE id = $1', [1]);
```

### sql

```typescript
const result = await pg.sql`SELECT * FROM users WHERE id = ${1}`;
const result = await pg.sql<{ id: string; name: string }>`
    SELECT * FROM users WHERE id = ${1}
`;
```

### connect

```typescript
const result = await pg.connect((client) => {
    return client.query('SELECT * FROM users WHERE id = $1', [1]);
});
```

### readonly

```typescript
const result = await pg.readonly.sql`SELECT * FROM users WHERE id = ${1}`;
```

### transaction

```typescript
const result = await pg.transaction((t) => {
    return t.sql`SELECT * FROM users WHERE id = ${1}`;
});
```

## Fragments

Even when using ORM, there's sometimes a need to write SQL queries. For that, this library provides a set of fragments for constructing queries. This is a powerful tool for constructing queries, which helps avoid mistakes in query formation and simplifies their reading. Fragments can be nested without fear of SQL injections. Fragments are very convenient and help avoid errors related to incorrect parameter position calculations in the query and maintaining them when changing the query.

To execute queries using fragments, use the `sql` method of the `Pg` class. To create fragments, use the `sql` helper:

```typescript
const result = await pg.sql`SELECT * FROM users WHERE id = ${1}`;
```

To create fragments, import `sql` from the library:

```typescript
import { sql } from '@untype/pg';

const filter = sql`WHERE id = ${1}`;
const result = await pg.sql`SELECT * FROM users ${filter}`;
```

The query will look like this:

```sql
SELECT * FROM users WHERE id = $1
```

Sometimes you may want to use fragments without breaking out parts of the query into variables, such as for specifying table and field names. For that, you can use the `raw` helper:

```typescript
import { sql, raw } from '@untype/pg';

const result = await pg.sql`SELECT * FROM ${raw('users')} WHERE id = ${1}`;
```

To join fragments, use the `join` helper:

```typescript
import { sql, raw, join } from '@untype/pg';

const result = await pg.sql`SELECT * FROM ${join([raw('users'), raw('users2')], ', ')} WHERE id = ${1}`;
```

The library also provides a handy helper for creating `insert` queries. Writing raw `insert` queries can easily lead to mistakes when there are many fields. For this, you can use the `makeInsertFragment` helper:

```typescript
const { columns, values, set } = makeInsertFragment({
    id: 1,
    name: 'test',
    age: 10,
});

const onConflictUpdate = set(['name', 'age']);

await t.sql`
    INSERT INTO users (${columns})
    VALUES (${values})
    ON CONFLICT(id) DO UPDATE
    SET ${onConflictUpdate}
`;
```

## Transactions

To execute queries in a transaction, use the `transaction` method of the `Pg` class. It takes a callback as an argument where you can execute database queries:

```typescript
const result = await pg.transaction(async (t) => {
    await t.sql`INSERT INTO users (id, name) VALUES (1, 'ALice')`;
    await t.sql`INSERT INTO users (id, name) VALUES (1, 'Bob')`;
});
```

The transaction will be committed automatically if the callback returns a `Promise` that resolves successfully. If the callback results in an error, the transaction will be rolled back. The result of the transaction execution will be returned from the `transaction` method.

-   Always try to use `await` when calling methods of the `t` object, as the transaction ends when the promise is resolved or rejected.
-   Do not use the transaction object outside of the callback, as it may be closed.
-   Do not use the transaction object in another transaction, as this may lead to deadlock.
-   Do not use `Promise.all` with transaction methods, as it is pointless. `node-postgres` supports an internal query queue, so all queries will be executed sequentially. Use a simple for loop to execute queries within the transaction.
-   Try to finish the transaction as early as possible, as this helps to avoid locks and reduces the number of active connections to the database. Without using a connection pooler, the overhead leads to creating expensive database connections.

Transactions are lazy - this means that even when calling the `transaction` method, a transaction will not be created until the first query to the database is executed. This prevents unnecessary transactions from being created. This is convenient for certain types of applications that create transactions at the start of processing a web request and end them when the request processing is complete. It also prevents transactions from being created if the queries are not executed at all.

### Transaction isolation levels

By default, transactions are created with the [`READ COMMITTED`](https://www.postgresql.org/docs/current/transaction-iso.html) isolation level. To change the isolation level, use the second argument of the `transaction` method:

```typescript
const result = await pg.transaction(
    async (t) => {
        await t.sql`INSERT INTO users (id, name) VALUES (1, 'ALice')`;
        await t.sql`INSERT INTO users (id, name) VALUES (1, 'Bob')`;
    },
    { isolationLevel: 'SERIALIZABLE' },
);
```

Note that this will result in a separate query to the database to change the isolation level.

### Manually ending transactions

You can manually commit or rollback a transaction inside the callback using the `commit` and `rollback` methods of the transaction object:

```typescript
const result = await pg.transaction(async (t) => {
    await t.sql`INSERT INTO users (id, name) VALUES (1, 'ALice')`;

    const [{ condition } = never()] = await t.sql<{ condition: boolean }>`SELECT check_condition() AS condition`;

    if (condition) {
        await t.rollback();
    } else {
        await t.commit();
    }
});
```

If the transaction is committed or rolled back manually, the transaction will not be automatically managed.

### Savepoints

To create savepoints, use the `savepoint` method of the transaction object:

```typescript
const result = await pg.transaction(async (t) => {
    await t.sql`INSERT INTO users (id, name) VALUES (1, 'ALice')`;
    await t.savepoint('sp1');
    await t.sql`INSERT INTO users (id, name) VALUES (1, 'Bob')`;

    await t.rollbackToSavepoint('sp1');
});
```

## Explain

`Pg` provides a tool for debugging queries and query execution plans. This is quite a raw and slow mechanism, so do not use it in production. To enable query debugging mode, call the static method `enableSlowExplainNotSuitableForProduction` of the `Pg` class and pass a `logger` to it. The mode cannot be disabled after being enabled.

```typescript
Pg.enableSlowExplainNotSuitableForProduction({ logger });
```

This feature can help you understand what's happening under the hood when your queries are running and potentially identify any inefficiencies or bottlenecks in the query execution plan. Just remember that it is not designed for use in a production environment due to the performance overhead it introduces.
