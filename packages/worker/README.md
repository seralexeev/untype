# 🛠️ untype/worker

This library is designed to provide a convenient way to describe and use deferred and recurrent tasks. Essentially, it acts as a wrapper around [graphile-worker](https://github.com/graphile/worker), adding helpful typed helpers for creating tasks and their handlers.

## 💡 Motivation

Many services need to perform tasks in the background. Examples include sending emails, processing images, synchronizing data with external services, and so on. All these tasks can be divided into two categories:

-   **Deferred tasks** - tasks that need to be executed once in the future.
-   **Recurrent tasks** - tasks that need to be executed periodically.

For system reliability, it's essential to process certain operations asynchronously with the use of retries. For instance, when handling an external webhook, you can add a task to the queue and return a 200 status. This way, we can still process the webhook even if one of our services becomes unavailable. Or when sending data to external services, we may encounter a situation where the external service is unavailable, but we don't want to deny servicing the current request. For example, when creating an order in an online store, we can opt to send the email later.

## Installation

```bash
# npm
npm install @untype/worker

# yarn
yarn add @untype/worker

# pnpm
pnpm add @untype/worker
```

## Usage

### Deferred Tasks

To create deferred tasks, we first need to describe the task handler and specify the input data it accepts. This requires defining a class:

```typescript
import { task } from '@untype/worker';

export class TodoWorker {
    constructor(private pg: Pg, private mail: MailService) {}

    public ['todo/SEND_EMAIL'] = task({
        input: z.object({ id: z.string() }),
        resolve: async ({ input }) => {
            const [todo = never()] = await this.pg.sql<{ id: string; title: string }>`
                SELECT t.title, u.email
                FROM todos AS t
                JOIN users AS u ON u.id = t.user_id
                WHERE t.id = ${input.id}
            `;

            await this.mail.send({
                to: todo.email,
                subject: 'New todo',
                text: `New todo: ${todo.title}`,
            });
        },
    });

    public ['todo/COUNT_TODO'] = task({
        resolve: async () => {
            const [{ count } = never()] = await this.pg.sql<{ count: number }>`
                SELECT COUNT(*) FROM todos
            `;

            console.log(count);
        },
    });
}
```

The `task` helper accepts a task configuration, which consists of the following fields:

-   `input` - task input data. [zod](https://github.com/colinhacks/zod) is used for input data validation.
-   `resolve` - a function that will be called when the task is executed. It takes an object with an `input` field as an argument.

You can create as many classes like this as you want and use DI for injecting external services. Then, all these classes need to be collected in one place and passed to the `createWorker` function:

```typescript
import { createWorker } from '@untype/worker';

export const { schedule, startWorker } = createWorker({ LogWorker });
```

This returns two functions:

-   `schedule` - a function for adding tasks to the queue
-   `startWorker` - a function for starting the worker

At the start of the application, you need to create a worker:

```typescript
await startWorker({ container, logger, pg });
```

After starting the application, the worker will connect to the database and listen to the task queue. To add a task to the queue, you need to call the `schedule` function:

```typescript
export class TodoController {
    public ['todo/upsert'] = rpc({
        input: z.object({
            id: z.string().optional(),
            text: z.string(),
        }),
        resolve: async ({ ctx, input }) => {
            const { id } = await e.Todos.create(ctx.t, {
                item: { userId: ctx.auth.id, ...input },
                selector: ['id'],
            });

            await schedule(ctx.t, {
                key: 'todo/SEND_EMAIL',
                input: { id: input.id },
            });
        },
    });
}
```

As you can see, `schedule` accepts a transaction. This ensures that you don't need to worry about task cancellations in case of an error after adding to the queue. In the example above, we don't want to send an email if the current transaction is not committed. The worker reads tasks with the isolation level of `READ COMMITTED`, thus avoiding `dirty read` issues.

### Recurrent Tasks

To create recurrent tasks, you need to use the `cron` helper:

```typescript
import { task, cron } from '@untype/worker';

export class TodoWorker {
    constructor(private pg: Pg, private mail: MailService) {}

    public ['

todo/SEND_EMAIL'] = task({
        input: z.object({ id: z.string() }),
        resolve: async ({ input }) => {
            const [todo = never()] = await this.pg.sql<{ id: string; title: string }>`
                SELECT t.title, u.email
                FROM todos AS t
                JOIN users AS u ON u.id = t.user_id
                WHERE t.id = ${input.id}
            `;

            await this.mail.send({
                to: todo.email,
                subject: 'New todo',
                text: `New todo: ${todo.title}`,
            });
        },
    });

    public ['todo/COUNT_TODO'] = cron({
        pattern: '* * * * *', // every minute
        resolve: async () => {
            const [{ count } = never()] = await this.pg.sql<{ count: number }>`
                SELECT COUNT(*) FROM todos
            `;

            console.log(count);
        },
    });
}
```

You can mix `cron` and `task` in the same file. Also, `cron` tasks can be added to the queue using `schedule`. In this case, they will be executed immediately after being added to the queue. `cron` tasks do not support input data.

### Additional Information

For more information about worker operations, you can check out [graphile-worker](https://github.com/graphile/worker)
