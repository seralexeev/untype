# untype/pg

This module exports a `Pg` class, which is a higher-level wrapper for the `pg` library, providing an easy way to manage multiple PostgreSQL connections and transactions.

### `Pg` class

The `Pg` class implements the `PgClient` interface and provides an API to perform SQL queries, transactions, and connection management on the master and read-only replicas of a PostgreSQL database.

#### Constructor

-   `applicationName` (optional): The name of the application using the connection, which can be useful for debugging purposes.
-   `master`: A `Pool` instance, a `PoolConfig` object, or a connection string for the master database.
-   `readonly` (optional): An array of `Pool` instances, `PoolConfig` objects, or connection strings for the read-only replicas.

#### Example

```typescript
import { Pg } from './pg';

const master = 'postgres://user:password@localhost/db_master';
const replica = 'postgres://user:password@localhost/db_replica';

const pg = new Pg({ applicationName: 'MyApp', master, readonly: [replica] });

const [row] = await pg.sql<{ id: string; first_name: string }>`
    SELECT * FROM users WHERE first_name = ${'Sam'}
`;
```
