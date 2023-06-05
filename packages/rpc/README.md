## @untype/rpc

This document provides comprehensive guidance on how to leverage the `@untype` library to construct applications from the ground up. It demonstrates an incremental approach, beginning with basic examples and gradually introducing more complex use cases.

The first step is creating a simple REST server that returns a string. Note that the server heavily relies on Dependency Injection (DI) principles. Consequently, you must use a DI framework, such as `tsyringe`, to instantiate the server.

### Minimal server

Here is a minimal example illustrating a server with a single endpoint:

```typescript
import 'reflect-metadata';

import { SimpleExecutor } from '@untype/rpc';
import { createControllers } from '@untype/rpc-express';
import express from 'express';
import { container } from 'tsyringe';

class HelloController extends SimpleExecutor {
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

import { SimpleExecutor } from '@untype/rpc';
import { createControllers } from '@untype/rpc-express';
import express from 'express';
import { container } from 'tsyringe';
```

This includes `reflect-metadata` to enable metadata reflection capabilities. `@untype` itself doesn't use metadata reflection, but it is required by `tsyringe`. If you use a different DI framework, you may not need to import `reflect-metadata`.

You can use any http framework with `@untype`. However, this example uses `express` to create the server.

Finally, `container` from `tsyringe` is imported to provide Dependency Injection (DI) capabilities.

```typescript
class HelloController extends SimpleExecutor {
    public ['GET /'] = this.rest({
        anonymous: true,
        resolve: () => 'Hello world',
    });
}
```

A new class, `HelloController`, is created extending the `SimpleExecutor` class. This controller class defines one HTTP GET endpoint at the root path ("/").

The `rest` method from `SimpleExecutor` is used to define this endpoint.

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

To verify user authentication, you can override the `auth` method of the `Executor` class. This method receives `HttpContext` and should return some value or null. The `Executor`'s authentication object type can be specified by providing a generic argument.

```diff
 import 'reflect-metadata';

-import { SimpleExecutor } from '@untype/rpc';
+import { HttpContext, SimpleExecutor } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import { container } from 'tsyringe';

-class HelloController extends SimpleExecutor {
+type User = { id: string };
+
+class HelloController extends SimpleExecutor<User> {
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

The context object is forwarded to the `resolve` callback. It contains the `auth` field and can be extended with custom fields. To manually specify context, use the `ControllerExecutor` class:

```diff
 import 'reflect-metadata';

-import { HttpContext, SimpleExecutor } from '@untype/rpc';
+import { ControllerExecutor, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import { container } from 'tsyringe';

 type User = { id: string };
+type Context = { userAgent: string };

-class HelloController extends SimpleExecutor<User> {
+class HelloController extends ControllerExecutor<Context, User> {
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

-import { ControllerExecutor, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ContentResponse, ControllerExecutor, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerExecutor<Context, User> {
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

-import { ContentResponse, ControllerExecutor, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ContentResponse, ControllerExecutor, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
+import { ReactNode } from 'react';
+import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerExecutor<Context, User> {
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

-import { ContentResponse, ControllerExecutor, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ControllerExecutor, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
-import { ReactNode } from 'react';
+import React, { ReactNode, isValidElement } from 'react';
 import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerExecutor<Context, User> {
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

-import { ControllerExecutor, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
+import { ContentResponse, ControllerExecutor, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import React, { ReactNode, isValidElement } from 'react';
 import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerExecutor<Context, User> {
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

 import { ContentResponse, ControllerExecutor, EndpointResponse, HttpContext, InvokeArgs } from '@untype/rpc';
 import { createControllers } from '@untype/rpc-express';
 import express from 'express';
 import React, { ReactNode, isValidElement } from 'react';
 import { renderToPipeableStream } from 'react-dom/server';
 import { container } from 'tsyringe';
+import z from 'zod';

 type User = { id: string };
 type Context = { userAgent: string };

 class HelloController extends ControllerExecutor<Context, User> {
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
