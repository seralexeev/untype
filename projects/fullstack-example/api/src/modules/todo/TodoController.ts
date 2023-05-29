import { BadRequestError } from '@untype/core';
import { singleton } from 'tsyringe';
import { z } from 'zod';
import { e } from '../../entities';
import { rpc } from '../rpc';
import { TodoStatusSchema } from './models';
import { schedule } from '../../worker';

@singleton()
export class TodoController {
    public ['todo/find'] = rpc({
        input: z.object({
            search: z.string().default(''),
            page: z.number(),
            pageSize: z.number(),
        }),
        resolve: async ({ ctx, input }) => {
            return e.Todos.findAndCount(ctx.t, {
                filter: {
                    text: { includesInsensitive: input.search },
                    userId: { equalTo: ctx.auth.id },
                },
                selector: {
                    id: true,
                    text: true,
                    tags: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    cover: true,
                    user: ['id', 'firstName', 'lastName'],
                },
            });
        },
    });

    public ['todo/getById'] = rpc({
        input: z.object({ id: z.string() }),
        resolve: async ({ ctx, input }) => {
            return e.Todos.findByPkOrError(ctx.t, {
                pk: { id: input.id },
                selector: {
                    id: true,
                    text: true,
                    tags: true,
                    status: true,
                    cover: true,
                    user: ['id', 'firstName', 'lastName'],
                },
            });
        },
    });

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
                input: {
                    id: input.id,
                },
            });
        },
    });

    public ['todo/delete'] = rpc({
        input: z.object({ id: z.string() }),
        resolve: async ({ ctx, input }) => {
            const id = await e.Todos.findFirstOrError(ctx.t, {
                selector: ['id'],
                filter: {
                    id: { equalTo: input.id },
                    userId: { equalTo: ctx.auth.id },
                },
            });

            if (!id) {
                throw new BadRequestError('Not found');
            }

            await e.Todos.delete(ctx.t, { pk: input });
        },
    });
}
