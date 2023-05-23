# 🚀 untype

Untype is a monorepo containing a variety of convenient tools for creating full-stack TypeScript applications. All these tools have proven their effectiveness in real-world projects with extensive codebases and heavy workloads. These solutions and approaches have similar counterparts, yet they significantly differ from them in their operational principles and ease of use.

## 📦 Packages

Documentation for packages marked with 📖 is available.

-   📖 [`@untype/pg`](./packages/pg/README.md) - Client for working with PostgreSQL.
-   📖 [`@untype/orm`](./packages/orm/README.md) - ORM for PostgreSQL.
-   📖 [`@untype/rpc`](./packages/rpc/README.md) - Type-safe RPC and REST server.
-   📖 [`@untype/config`](./packages/config/README.md) - Library for loading and validating configurations.

TODO: Add documentation for the following packages:

-   🔴 [`@untype/core`](./packages/core/README.md) - Basic types and utilities.
-   🔴 [`@untype/geo`](./packages/geo/README.md) - Geojson and Zod schemas for working together with `@untype/orm`.
-   🔴 [`@untype/logger`](./packages/logger/README.md) - Logger.
-   🔴 [`@untype/dumper`](./packages/dumper/README.md) - Dumper.
-   🔴 [`@untype/migrations`](./packages/migrations/README.md) - Library for handling migrations.
-   🔴 [`@untype/worker`](./packages/worker/README.md) - Library for easy handling of queues and workers.
-   🔴 [`@untype/rpc-react`](./packages/rpc-react/README.md) - React hooks for working with `@untype/rpc`.
-   🔴 [`@untype/rpc-express`](./packages/rpc-express/README.md) - Middleware for Express to work with `@untype/rpc`.

## 🔥 Examples

-   [fullstack-example](./projects/fullstack-example) - Example of a full-stack application using `@untype/rpc`, `@untype/orm`, `@untype/worker`, `@untype/config`, `@untype/logger`, `@untype/dumper`, `@untype/migrations`, `@untype/pg`, `@untype/geo`, `@untype/rpc-react`, `@untype/rpc-express`. It uses `antd` on the frontend side.
-   [minimal-example](./projects/minimal-example) - Minimal example of a full-stack application using `@untype/rpc`

## 🟢 Run

Use `moon` command to run the apps:

-   `moon check --all`
-   `moon run fullstack-example-web:dev`
