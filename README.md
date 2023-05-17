# @untype

This document provides comprehensive guidance on how to leverage the `@untype` library to construct applications from the ground up. It demonstrates an incremental approach, beginning with basic examples and gradually introducing more complex use cases.

## @untype/rpc

The first step is creating a simple REST server that returns a string. Note that the server heavily relies on Dependency Injection (DI) principles. Consequently, you must use a DI framework, such as `tsyringe`, to instantiate the server.

### Minimal server

Here is a minimal example illustrating a server with a single endpoint:

```typescript
import 'reflect-metadata';

import { SimpleInvoker } from '@untype/rpc';
import { createControllers } from '@untype/rpc-express';
import express from 'express';
import { container } from 'tsyringe';

class HelloController extends SimpleInvoker {
    public ['GET /'] = this.rest({
        anonymous: true,
        resolve: () => 'Hello world',
    });
}

express()
    .use('/', createControllers({ controllers: { HelloController }, container }))
    .listen(3000);
```

The first part of the code is importing the necessary dependencies for the server.

```typescript
import 'reflect-metadata';

import { SimpleInvoker } from '@untype/rpc';
import { createControllers } from '@untype/rpc-express';
import express from 'express';
import { container } from 'tsyringe';
```

This includes `reflect-metadata` to enable metadata reflection capabilities. `@untype` itself doesn't use metadata reflection, but it is required by `tsyringe`. If you use a different DI framework, you may not need to import `reflect-metadata`.

You can use any http framework with `@untype`. However, this example uses `express` to create the server.

Finally, `container` from `tsyringe` is imported to provide Dependency Injection (DI) capabilities.

```typescript
class HelloController extends SimpleInvoker {
    public ['GET /'] = this.rest({
        anonymous: true,
        resolve: () => 'Hello world',
    });
}
```

A new class, `HelloController`, is created extending the `SimpleInvoker` class. This controller class defines one HTTP GET endpoint at the root path ("/").

The `rest` method from `SimpleInvoker` is used to define this endpoint.

The `anonymous` property is set to `true`, allowing the endpoint to be accessed without authentication.

The `resolve` property is a function that returns the string "Hello world". This is the response that will be sent to the client when the endpoint is accessed.

```typescript
express()
    .use('/', createControllers({ controllers: { HelloController }, container }))
    .listen(3000);
```

The `createControllers` function is used to create a middleware for `@untype/rpc` and is added to the root path ("/").

The `controllers` object passed to `createControllers` should map controller names to their corresponding classes, and the `container` should be the DI container to be used for creating controller instances.

### Authentication

To verify user authentication, you can override the `auth` method of the `Invoker` class. This method receives `HttpContext` and should return some value or null. The `Invoker`'s authentication object type can be specified by providing a generic argument.

```diff
 import 'reflect-metadata';

-import { SimpleInvoker } from '@untype/rpc';
+import { HttpContext, SimpleInvoker } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import { container } from 'tsyringe';

-class HelloController extends SimpleInvoker {
+type User = { id: string };
+
+class HelloController extends SimpleInvoker<User> {
     public ['GET /'] = this.rest({
         anonymous: true,
-        resolve: () => 'Hello world',
+        resolve: ({ ctx }) => `Hello ${ctx.auth?.id ?? 'world'}`,
     });
+
+    public override auth = async (ctx: HttpContext) => {
+        const userId = ctx.req.headers['x-user-id'];
+        if (typeof userId === 'string') {
+            return { id: userId };
+        }
+
+        return null;
+    };
 }

 express()
     .use('/', createControllers({ controllers: { HelloController }, container }))
     .listen(3000);

```

The library verifies user authentication by invoking the `auth` method. If it returns null, the user is considered unauthenticated. If the endpoint is anonymous, the `auth` method is still invoked, but the `ctx.auth` field is nullable. For non-anonymous endpoints, `ctx.auth` is non-nullable, and the library will raise a 401 error if the `auth` method returns null.

### Context

The context object is forwarded to the `resolve` callback. It contains the `auth` field and can be extended with custom fields. To manually specify context, use the `ControllerInvoker` class:

```diff
 import 'reflect-metadata';

-import { HttpContext, SimpleInvoker } from '@untype/rpc';
+import { ControllerInvoker, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import { container } from 'tsyringe';

 type User = { id: string };
+type Context = { userAgent: string };

-class HelloController extends SimpleInvoker<User> {
+class HelloController extends ControllerInvoker<Context, User> {
     public ['GET /'] = this.rest({
         anonymous: true,
-        resolve: ({ ctx }) => `Hello ${ctx.auth?.id ?? 'world'}`,
+        resolve: ({ ctx }) => `Hello ${ctx.auth?.id ?? 'world'} from ${ctx.userAgent}`,
     });

     public override auth = async (ctx: HttpContext) => {
         const userId = ctx.req.headers['x-user-id'];
         if (typeof userId === 'string') {
             return { id: userId };
         }

         return null;
     };
+
+    public override invoke = async ({ resolve, req }: InvokeArgs<Context, User>) => {
+        const ctx = {
+            userAgent: req.headers['user-agent'] as string,
+        };
+
+        return resolve(ctx);
+    };
 }

 express()
     .use('/', createControllers({ controllers: { HelloController }, container }))
     .listen(3000);
 }
```

Endpoints can return different content types. To do this, use existing types or create a new one. As an example, let's return some HTML from the endpoint using React as a template engine. By default, data is serialized to JSON.

### Custom Response Types

```diff
 import 'reflect-metadata';

-import { ControllerInvoker, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ContentResponse, ControllerInvoker, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerInvoker<Context, User> {
     public ['GET /'] = this.rest({
         anonymous: true,
-        resolve: ({ ctx }) => `Hello ${ctx.auth?.id ?? 'world'} from ${ctx.userAgent}`,
+        resolve: ({ ctx }) => ContentResponse.html`
+            <html lang='en'>
+                <head>
+                    <meta charSet='UTF-8' />
+                    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
+                    <title>Hello from Html</title>
+                </head>
+                <body>
+                    Hello ${ctx.auth?.id ?? 'world'} from ${ctx.userAgent}!
+                </body>
+            </html>
+        `,
     });

     public override auth = async (ctx: HttpContext) => {
         const userId = ctx.req.headers['x-user-id'];
         if (typeof userId === 'string') {
             return { id: userId };
         }

         return null;
     };

     public override invoke = async ({ resolve, req }: InvokeArgs<Context, User>) => {
         const ctx = {
             userAgent: req.headers['user-agent'] as string,
         };

         return resolve(ctx);
     };
 }

 express()
     .use('/', createControllers({ controllers: { HelloController }, container }))
     .listen(3000);
```

`ContentResponse.html` is a helper function that returns `ContentResponse` instance with `text/html` content type. It is a shortcut for `new ContentResponse({ type: 'text/html', body: ... })`.

### Static React Rendering

Instead of creating html by interpolating strings we can use React to render it. To do this we need to install `react` and `react-dom` packages. Then we need to implement custom `EndpointResponse` class:

```diff
 import 'reflect-metadata';

-import { ContentResponse, ControllerInvoker, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ContentResponse, ControllerInvoker, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
+import { ReactNode } from 'react';
+import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerInvoker<Context, User> {
     public ['GET /'] = this.rest({
         anonymous: true,
         resolve: ({ ctx }) => ContentResponse.html`
             <html lang='en'>
                 <head>
                     <meta charSet='UTF-8' />
                     <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                     <title>Hello from Html</title>
                 </head>
                 <body>
                     Hello ${ctx.auth?.id ?? 'world'} from ${ctx.userAgent}!
                 </body>
             </html>
         `,
     });

     public override auth = async (ctx: HttpContext) => {
         const userId = ctx.req.headers['x-user-id'];
         if (typeof userId === 'string') {
             return { id: userId };
         }

         return null;
     };

     public override invoke = async ({ resolve, req }: InvokeArgs<Context, User>) => {
         const ctx = {
             userAgent: req.headers['user-agent'] as string,
         };

         return resolve(ctx);
     };
 }

+class StaticReact extends EndpointResponse {
+    public constructor(private children: ReactNode) {
+        super();
+    }
+
+    public override write({ res }: HttpContext) {
+        res.setHeader('Content-Type', 'text/html');
+        const { pipe } = renderToPipeableStream(this.children);
+
+        return new Promise<void>((resolve, reject) => {
+            pipe(res).on('error', reject).on('close', resolve);
+        });
+    }
+}
+
 express()
     .use('/', createControllers({ controllers: { HelloController }, container }))
     .listen(3000);
```

If we return instance of the class from the endpoint the server doesn't know anything about `ReactNode` type so we need to handle it manually to wrap it with the `StaticReact` class:

```diff
 import 'reflect-metadata';

-import { ContentResponse, ControllerInvoker, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ControllerInvoker, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
-import { ReactNode } from 'react';
+import React, { ReactNode, isValidElement } from 'react';
 import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerInvoker<Context, User> {
     public ['GET /'] = this.rest({
         anonymous: true,
-        resolve: ({ ctx }) => ContentResponse.html`
+        resolve: ({ ctx }) => (
             <html lang='en'>
                 <head>
                     <meta charSet='UTF-8' />
                     <meta name='viewport' content='width=device-width, initial-scale=1.0' />
-                    <title>Hello from Html</title>
+                    <title>Hello from React</title>
                 </head>
                 <body>
-                    Hello ${ctx.auth?.id ?? 'world'} from ${ctx.userAgent}!
+                    Hello {ctx.auth?.id ?? 'world'} from {ctx.userAgent}!
                 </body>
             </html>
-        `,
+        ),
     });

     public override auth = async (ctx: HttpContext) => {
         const userId = ctx.req.headers['x-user-id'];
         if (typeof userId === 'string') {
             return { id: userId };
         }

         return null;
     };

     public override invoke = async ({ resolve, req }: InvokeArgs<Context, User>) => {
         const ctx = {
             userAgent: req.headers['user-agent'] as string,
         };

         return resolve(ctx);
     };
+
+    public override onRawOutput = async (output: unknown) => {
+        return isValidElement(output) ? new StaticReact(output) : super.onRawOutput(output);
+    };
 }

 class StaticReact extends EndpointResponse {
     public constructor(private children: ReactNode) {
         super();
     }

     public override write({ res }: HttpContext) {
         res.setHeader('Content-Type', 'text/html');
         const { pipe } = renderToPipeableStream(this.children);

         return new Promise<void>((resolve, reject) => {
             pipe(res).on('error', reject).on('close', resolve);
         });
     }
 }

 express()
     .use('/', createControllers({ controllers: { HelloController }, container }))
     .listen(3000);

```

Now we can return `ReactNode` from any endpoint of the controller and it will be rendered as `html`.

This approach is useful if you need to create an endpoint with static html content. Auth page, payment page, T&C page, etc. and you don't want to host it as a separate file.

### Adding interaction

Now let's add some interaction to our page. To do that we can introduce a new endpoint that will return a script with a function that will be called on the page load:

```diff
 import 'reflect-metadata';

-import { ControllerInvoker, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ContentResponse, ControllerInvoker, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import React, { ReactNode, isValidElement } from 'react';
 import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerInvoker<Context, User> {
     public ['GET /'] = this.rest({
         anonymous: true,
         resolve: ({ ctx }) => (
             <html lang='en'>
                 <head>
                     <meta charSet='UTF-8' />
                     <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                     <title>Hello from React</title>
                 </head>
                 <body>
                     Hello {ctx.auth?.id ?? 'world'} from {ctx.userAgent}!
+                    <script src='/script' />
                 </body>
             </html>
         ),
     });

+    public ['GET /script'] = this.rest({
+        anonymous: true,
+        resolve: () => ContentResponse.javascript`
+            alert('Hello from React!');
+        `,
+    });
+
     public override auth = async (ctx: HttpContext) => {
         const userId = ctx.req.headers['x-user-id'];
         if (typeof userId === 'string') {
             return { id: userId };
         }

         return null;
     };

     public override invoke = async ({ resolve, req }: InvokeArgs<Context, User>) => {
         const ctx = {
             userAgent: req.headers['user-agent'] as string,
         };

         return resolve(ctx);
     };

     public override onRawOutput = async (output: unknown) => {
         return isValidElement(output) ? new StaticReact(output) : super.onRawOutput(output);
     };
 }

 class StaticReact extends EndpointResponse {
     public constructor(private children: ReactNode) {
         super();
     }

     public override write({ res }: HttpContext) {
         res.setHeader('Content-Type', 'text/html');
         const { pipe } = renderToPipeableStream(this.children);

         return new Promise<void>((resolve, reject) => {
             pipe(res).on('error', reject).on('close', resolve);
         });
     }
 }

 express()
     .use('/', createControllers({ controllers: { HelloController }, container }))
     .listen(3000);

```

### Input validation

Now we can add a form with to post the data to the server:

```diff
 import 'reflect-metadata';

 import { ContentResponse, ControllerInvoker, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import React, { ReactNode, isValidElement } from 'react';
 import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';
+import z from 'zod';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerInvoker<Context, User> {
     public ['GET /'] = this.rest({
         anonymous: true,
         resolve: ({ ctx }) => (
             <html lang='en'>
                 <head>
                     <meta charSet='UTF-8' />
                     <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                     <title>Hello from React</title>
                 </head>
                 <body>
                     Hello {ctx.auth?.id ?? 'world'} from {ctx.userAgent}!
+                    <form>
+                        <label htmlFor='name'>Email</label>
+                        <input type='text' name='name' id='name' />
+
+                        <button type='submit'>Submit</button>
+                    </form>
                     <script src='/script' />
                 </body>
             </html>
         ),
     });

     public ['GET /script'] = this.rest({
         anonymous: true,
         resolve: () => ContentResponse.javascript`
-            alert('Hello from React!');
+            document.querySelector('form').addEventListener('submit', () => {
+                event.preventDefault();
+                const data = new FormData(event.target);
+
+                fetch('/', {
+                    method: 'POST',
+                    headers: {
+                        'Content-Type': 'application/json',
+                    },
+                    body: JSON.stringify({
+                        name: data.get('name'),
+                    }),
+                }).then((x) => x.text()).then((x) => alert(x));
+            });
         `,
     });

+    public ['POST /'] = this.rest({
+        anonymous: true,
+        input: z.object({
+            name: z.string(),
+        }),
+        resolve: ({ input }) => ({
+            message: `Hello ${input.name}`,
+        }),
+    });
+
     public override auth = async (ctx: HttpContext) => {
         const userId = ctx.req.headers['x-user-id'];
         if (typeof userId === 'string') {
             return { id: userId };
         }

         return null;
     };

     public override invoke = async ({ resolve, req }: InvokeArgs<Context, User>) => {
         const ctx = {
             userAgent: req.headers['user-agent'] as string,
         };

         return resolve(ctx);
     };

     public override onRawOutput = async (output: unknown) => {
         return isValidElement(output) ? new StaticReact(output) : super.onRawOutput(output);
     };
 }

 class StaticReact extends EndpointResponse {
     public constructor(private children: ReactNode) {
         super();
     }

     public override write({ res }: HttpContext) {
         res.setHeader('Content-Type', 'text/html');
         const { pipe } = renderToPipeableStream(this.children);

         return new Promise<void>((resolve, reject) => {
             pipe(res).on('error', reject).on('close', resolve);
         });
     }
 }

 express()
+    .use(express.json())
     .use('/', createControllers({ controllers: { HelloController }, container }))
     .listen(3000);

```

We added one more endpoint to handle request. As you can see we also specified the input schema for the endpoint. Validation is done by `zod` library. We also added `express.json()` middleware to parse the request body.

## @untype/rpc-react

You can use inferred input and for your client side application. To do it you need to export typing from the server side and create a react hook to call the rpc methods:

### Server side:

```ts
export const controllers = {
    AuthController,
    ConfigController,
    TodoController,
    FileController,
};

export type Api = RpcApi<typeof controllers>;
```

### Client side:

```tsx
// rpc.ts
export const { useRpc, useInvalidate, useReset } = createRpcHook<Api>({ path: '/api' });

// component.ts
const { data, refetch, isLoading } = useRpc('todo/find').useQuery({
    input: { page, pageSize, search },
});
```

The library uses `react-query` under the hood with some additional features such as file handling and invalidation.

## @untype/config

`@untype/config` is a library for loading configuration from environment variables. It uses zod to validate the configuration. The library support loading configuration from `ts` files and environment variables.

To define configuration schema we need to create a file `default.ts` file:

```ts
import { ConfigShape } from '@untype/config';
import z from 'zod';

export const { shape, define } = new ConfigShape({
    server: {
        port: z.number().default(3000),
    },
    auth: {
        google: {
            clientId: z.string(),
            clientSecret: z.string(),
        },
    },
    pg: {
        user: z.string().default('untype'),
        password: z.string().default('untype'),
        database: z.string().default('untype'),
        host: z.string().default('localhost'),
        port: z.number().default(5434),
    },
});
```

You can export `shape` and `define` from the file and use them to override the config for different environments. It's convinient to define non secret configuration in the `default.ts`. It allows you to use the same configuration for development and production environments and easily override values in runtime if needed.

To override some values for the local environment you can create `local.ts` file:

```ts
import { define } from './default';

export const local = define({
    server: {
        port: 3001,
    },
    logger: {
        level: 'debug',
        pretty: 'yaml',
    },
});
```

The config is validated on the compile time. If you try to override the value with the wrong type you will get a compile error.
You can create many files like `local.ts` for different environments. For example you can create `prod.ts` file to override the config for the production environment.

Next step is creating configuration class that can load and parse the configuration:

```ts
import { createConfig } from '@untype/config';

import { shape } from './env/default';
import { dev } from './env/dev';
import { local } from './env/local';
import { prod } from './env/prod';

export class Config extends createConfig({
    shape,
    prefix: 'UNTYPE_EXAMPLE__',
    source: process.env,
    environments: { prod, local, dev },
}) {}
```

The `createConfig` function accepts the configuration shape, prefix for the environment variables, source of the environment variables and the map of the environments. The `source` can be any `Record<string, string | undefined>` The `environments` is a map of the environment names to the configuration overrides. The `prefix` is used to filter environment variables. For example if you set the prefix to `UNTYPE_EXAMPLE__` the library will only use environment variables that start with `UNTYPE_EXAMPLE__`. The prefix is also used to generate the environment variable names for the nested configuration values. The library will use the following environment variables:

```shell
export UNTYPE_EXAMPLE__server_port=3001
export UNTYPE_EXAMPLE__auth_google_clientId=123
```

The pattern is `<prefix><a>_<b>_<c>`. So that you don't need to define the environment variables for the nested values. The library will automatically infers the environment variable names for the nested values.

### Supported types

Not all zod types are supported. The library supports simple types such as `string`, `number`, `boolean`, `unions` etc.

### Loading configuration

To load the configuration you need to call async `load()` method on the config class:

```ts
import { Config } from './config';

const config = await Config.load();
```

If the library can't find the configuration it will throw an error. So that you can call the load function on start of the application. Usually if the configuration is missing it means that the application is misconfigured and it's better to fail fast. The cluster scheduler will restart the application and it will try to load the configuration again until you fix the problem.

The loader tries to find `<prefix>env` or `ENVIRONMENT` environment variable first. It uses the value of the variable to find the environment. If there is no such variable it will fail. Then it loads configuration in the following order merging the values:

1.  from the default configuration
2.  from the corresponding environment override
3.  from the environment variables

The last value overrides the previous ones. The loader will throw an error if the configuration is invalid.

### Using configuration

The `Config` is a regular class with public property `config`. You can use it as a dependency in the controllers or other classes:

```ts
import { Config } from './config';

class HelloController {
    private config;

    public constructor(private { config }: Config) {
        super();
    }

    public ['GET /config'] = this.rest({
        anonymous: true,
        resolve: () => ({
            clientId: this.config.auth.google.clientId,
        }),
    });
}
```

## @untype/logger

`@untype/logger` is a library for logging. It uses json to serialize messages in the `prod` and any other non dev environments. Locally it provides super readable `yaml` formatting with syntax highlighting.

You can import default logger instance from the package or create a new instance:

```ts
import { Logger } from '@untype/logger';

export const logger = new Logger({
    level: 'debug',
    pretty: env.NODE_ENV === 'production' ? 'json' : 'yaml',
});
```

In the local environment the output uses `yaml`:

```bash
01:31:00 INFO Server listening on port 3000
┌ config:
│   server:
│     port: 3000
│     includeErrorsResponse: true
│   logger:
│     pretty: yaml
│     level: debug
│   auth:
│     google:
│       clientId: ***
│       clientSecret: ***
│   pg:
│     user: untype
│     password: untype
│     database: untype
│     host: localhost
│     port: 5434
│   env: local
└   version: 0.0.0
```

## untype/pg

This package was created to provide a standard way to access pg database.

## Motivation

Even if there's an ORM sometimes you need to perform raw queries to optimize performance, use some database functions and use some extensions (e.g PostGIS)

To do it you usually need to add [pg](https://www.npmjs.com/package/pg) and perform queries in the following way:

```typescript
const { Client } = require('pg');
const client = new Client();
await client.connect();
const res = await client.query('SELECT $1::text as message', ['Hello world!']);
console.log(res.rows[0].message);
await client.end();
```

In the production environment better to use connection pool, even if you have `bgbouncer` in front of you database:

```typescript
const { Pool } = require('pg');
const pool = new Pool();
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        console.log(result.rows);
    });
});
```

Luckily `Pool` is a class so you use DI to inject dependencies into our classes by registering it using di container:

```typescript
const pool = new Pool({
    connectionString: 'postgres://untype:untype@localhost:5432/untype',
});
container.register(Pool, { useValue: pool });
```

And then use in any service.

The `Pool` class provides all you need to perform queries, but **it too low level so we can improve the situation a little**.

You need to open connection to the database, perform query, close connection, handle errors, etc. It's not a big deal but it's a boilerplate code that can be moved to the separate class.

Also you need to sync placeholders in the query with the parameters:

```typescript
client.query('SELECT * FROM users WHERE id = $1', [userId]);
```

When number of parameters is small it's not a big deal, but when you have a lot of parameters it's easy to make a mistake.

## Pg

_Some queries are invalid and provided just an example of how to use the package._

Pg - is a class which wraps the `Pool` and provides convenient interface to perform raw sql queries with the protection from sql injections.

### Creating

To create and register a `Pg` instance use the constructor:

```typescript
const pool = new Pool({
    connectionString: 'postgres://untype:untype@localhost:5432/untype',
});

container.register(Pg, { useValue: new Pg(pool) });
```

### Using

The `Pg` class has following methods and fields:

-   `pool` - a reference to the pool;
-   `close` - close underline pool if the `Pg` was created using connection string;
-   `transaction` - helper to perform queries in a single transaction;
-   `sql` - tagged template literal helper;

### Sql tagged template

This function utilizes [js tagged template syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates):

```typescript
const users = await this.pg.sql`SELECT * FROM users`;
```

The function performs the query using a connection from the pool and returns promise of the `rows` field from a [Result](https://node-postgres.com/api/result) instance.

The tagged template syntax allows you to use variables right inside you queries:

```typescript
const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const users = await this.pg.sql`SELECT * FROM users WHERE id = ${id}`;
```

**The function also protects you from sql injections, so you can use variables without any additional checks.**

Under the hood the function doesn't naively concatenate strings, it extracts all variables and replaces them with `$1`, `$2` and so on. Then it performs the query using the `pool.query` method.

The function is **generic**, so you can specify the type of the result:

```typescript
const rows = await pg.sql<{ id: string; name: string }>`SELECT id, name FROM users WHERE id = ${id}`;
// or
type UserRow = { id: string; name: string };
const rows = await pg.sql<UserRow>`SELECT id, name FROM users WHERE id = ${id}`;
```

You can reuse sql fragments using the `sql` function:

```typescript
const q1 = sql`SELECT * FROM users WHERE name ilike ${'untype'}`;
const q2 = sql`SELECT * FROM roles WHERE role_group IN (${['hq', 'admin']})`;
const field = raw('name');

const rows = await pg.sql`
    SELECT u.${field}, r.name
    FROM (${q1}) AS u
    INNER JOIN (${q2}) AS r ON u.role_id = r.id
`;
```

The raw helper allows you to use raw sql fragments instead of variables:

```typescript
const orderBy = raw('name');
const orderDirection = raw('ASC');

const rows = await pg.sql`
    SELECT * 
    FROM users
    ORDER BY ${orderBy} ${orderDirection}
`;
```

Be careful, the `raw` helper doesn't protect you from sql injections, so you should use it only with trusted data. You can combine it with `zod`'s enums to validate input data.

The `sql` function invokes query in a implicit transaction. With default `READ COMMITTED` isolation level.

### Transaction

The `Pg` class provides a helper to perform queries in a single transaction:

```typescript
const result = await this.pg.transaction(async (pg) => {
    const user = await pg.sql`SELECT * FROM users WHERE id = ${id}`;
    const roles = await pg.sql`SELECT * FROM roles WHERE id IN (${user.role_ids})`;

    return { user, roles };
});
```

The helper takes a function which receives a `Pg` instance and returns a promise. The helper performs the following steps:

-   Acquires a connection from the pool;
-   Starts a transaction;
-   Calls the function with the `Pg` instance;
-   If the function resolves commits the transaction;
-   If the function rejects rolls back the transaction;
-   Releases the connection back to the pool;
-   Returns the result of the function.
-   If the function throws an error the helper rejects with the error.

The helper is useful when you need to perform multiple queries in a single transaction:

```typescript
class UserService {
    private changeUser = () => {
        const result = await this.t.transaction(async (t) => {
            const user = await t.sql`SELECT * FROM users WHERE id = ${id}`;

            this.updateUserRoles(t, user, roles);
            this.updateUserPermissions(t, user, permissions);

            return { user, roles };
        });
    };

    private updateUserRoles = async (t: Pg, user: User, roles: string[]) => {
        await t.sql`DELETE FROM user_roles WHERE user_id = ${user.id}`;
        await t.sql`INSERT INTO user_roles (user_id, role_id) VALUES ${roles.map((role) => [user.id, role])}`;
    };

    private updateUserPermissions = async (t: Pg, user: User, permissions: string[]) => {
        await t.sql`DELETE FROM user_permissions WHERE user_id = ${user.id}`;
        await t.sql`INSERT INTO user_permissions (user_id, permission_id) VALUES ${permissions.map((permission) => [
            user.id,
            permission,
        ])}`;
    };
}
```

If the `updateUserPermissions` function throws an error the transaction will be rolled back and changes in `updateUserRoles` will be discarded. So that you won't get inconsistent data.

The transaction function accepts a second argument with the following options:

-   `isolationLevel` - transaction isolation level, see [Pg Transactions](https://www.postgresql.org/docs/current/transaction-iso.html);

## Read replicas

You can specify read replicas to perform readonly queries:

```ts
const pg = new Pg({
    applicationName: 'fullstack-example',
    master: config.pg.master,
    readonly: config.pg.replicas,
});

await pg.readonly.sql`SELECT pg_is_in_recovery()`;
```

## Syntax highlighting

To enable syntax highlighting for the `sql` tagged template you can use the - [SQL tagged template literals](https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals) extension.

It also checks sql queries for errors, but doesn't work well with sql fragments and raw fragments.

## @untype/orm

**@untype/orm** is a simple but powerful ORM for PostgreSQL based on postgraphile and tightly integrated with @untype/pg.

The idea is to use the power of postgraphile query builder but completely remove the need to generate types and write gql queries by hand. Postgraphile introspects the database and generates GraphQL schema so that you can query the database using GraphQL queries without writing SQL to join tables and filter data. It's fast and easy to use but it has some drawbacks:

-   You need to write GraphQL queries by hand;
-   You need to generate types for GraphQL queries;
-   It's challenging to use transactions and raw SQL queries.

**@untype/orm** solves these problems by providing a simple API to perform queries and mutations using GraphQL queries and mutations.

### Usage

To use **@untype/orm** you need to define your entities (you can use generators to generate entities from the database schema):

```ts
import { EntityAccessor, Field, ForeignField, PrimaryKey } from '@untype/orm';

export type Todo = {
    pk: PrimaryKey<{ id: string }>;
    id: Field<string, string | undefined>;
    status: Field<string, string>;
    tags: Field<string[], string[] | undefined>;
    text: Field<string, string>;
    userId: Field<string, string>;
    createdAt: Field<Date, Date | undefined>;
    updatedAt: Field<Date, Date | undefined>;
    user: ForeignField<User>;
};

export type User = {
    pk: PrimaryKey<{ id: string }>;
    id: Field<string, string | undefined>;
    email: Field<string, string>;
    firstName: Field<string, string>;
    lastName: Field<string, string>;
    createdAt: Field<Date, Date | undefined>;
    updatedAt: Field<Date, Date | undefined>;
    todosConnection: ConnectionField<Todo>;
    todos: QueryableListField<Todo>;
};

export const Todos = new EntityAccessor<Todo>('Todo');
export const Users = new EntityAccessor<User>('User');
```

Then you need to create an instance of `Pg`:

```ts
import { Pg } from '@untype/pg';

const pg = new Pg({ applicationName: 'fullstack-example', master: config.pg.master });
```

and pass it as a first argument to `EntityAccessor`:

```ts
const todos = await e.Todos.findAndCount(pg, {
    filter: {
        text: { includesInsensitive: 'test' },
    },
    selector: {
        id: true,
        text: true,
        tags: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: ['id', 'firstName', 'lastName'],
    },
    limit: 10,
    offset: 1,
});
```

-   The type of the `todos` object is inferred automatically from the `selector` argument. It handles relations and collections automatically. You can use array or object like syntax to specify the fields you want to select. By design you can't select all fields by default, you need to specify them explicitly. It's a good practice to specify only the fields you need to reduce the size of the response.
-   `filter` is a typed version of `postgraphile-plugin-connection-filter`

To use transaction you need to create a transaction using `Pg.transaction` helper and pass it as a first argument to `EntityAccessor`:

```ts
const { todos, count } = await pg.transaction((t) => {
    const [count = never()] = t.sql<{ count: number }>`SELECT COUNT(*) AS "count" FROM todos`;

    const todos = await e.Todos.findAndCount(t, {
        filter: {
            text: { includesInsensitive: 'test' },
        },
        selector: {
            id: true,
            text: true,
            tags: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            user: ['id', 'firstName', 'lastName'],
        },
        limit: 10,
        offset: 1,
    });

    return { count, todos };
});
```

You can find more examples in the [fullstack-example](./projects/fullstack-example/) project.

## @untype/worker

TODO

## @untype/migrations

TODO

## @untype/core

TODO

## @untype/dumper

TODO
