import 'reflect-metadata';
import 'source-map-support/register';

import { describe, expect, it } from '@jest/globals';
import { SimpleInvoker, createEndpointFactory } from '@untype/rpc';
import supertest from 'supertest';
import { container } from 'tsyringe';

import { createServer } from './middleware';

const makeRequest = (Controller: Record<string, unknown>) => {
    const { app } = createServer({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        logger: { dump: () => {}, error: () => {} },
        container,
        controllers: { Controller },
    });
    return supertest(app);
};

describe('Express Middleware', () => {
    const { rest } = createEndpointFactory(class extends SimpleInvoker {});

    it.each(['GET', 'POST', 'PUT', 'DELETE'] as const)('$1 /value returns expected', async (method) => {
        const request = makeRequest({
            [`${method} /value`]: rest({ anonymous: true, resolve: () => 1 }),
        });

        const { body, statusCode, headers } = await request[method.toLowerCase() as Lowercase<typeof method>]('/value').set(
            'Content-Type',
            'application/json',
        );

        expect(statusCode).toEqual(200);
        expect(body).toEqual(1);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('POST /value returns 404', async () => {
        const { statusCode } = await makeRequest({
            ['GET /value']: rest({
                anonymous: true,
                resolve: () => 1,
            }),
        })
            .post('/value')
            .set('Content-Type', 'application/json');

        expect(statusCode).toEqual(404);
    });

    it('params parsed as expected', async () => {
        const { statusCode, body } = await makeRequest({
            ['GET /users/:id/:data']: rest({
                anonymous: true,
                resolve: ({ params }) => params,
            }),
        })
            .get('/users/1/tasks')
            .set('Content-Type', 'application/json');

        expect(statusCode).toEqual(200);
        expect(body).toEqual({ id: '1', data: 'tasks' });
    });
});
