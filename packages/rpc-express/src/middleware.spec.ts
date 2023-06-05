import 'reflect-metadata';
import 'source-map-support/register';

import { describe, expect, it } from '@jest/globals';
import { createEndpointFactory } from '@untype/rpc';
import supertest from 'supertest';
import { container } from 'tsyringe';

import { ExpressExecutor } from '.';
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
    const { rest } = createEndpointFactory(
        class extends ExpressExecutor<any, any, any> {
            public override invoke = async ({ resolve }: typeof this.types.invoke) => {
                return resolve({});
            };
        },
    );

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
                resolve: ({ params }: any) => params,
            }),
        })
            .get('/users/1/tasks')
            .set('Content-Type', 'application/json');

        expect(statusCode).toEqual(200);
        expect(body).toEqual({ id: '1', data: 'tasks' });
    });

    it('should handle errors thrown by controllers', async () => {
        const request = makeRequest({
            'GET /error': rest({
                anonymous: true,
                resolve: () => {
                    throw new Error('Test error');
                },
            }),
        });
        const { statusCode, body } = await request.get('/error').set('Content-Type', 'application/json');
        expect(statusCode).toEqual(500);
        expect(body).toEqual({ code: 'INTERNAL_ERROR' });
    });

    it('should handle async errors thrown by controllers', async () => {
        const request = makeRequest({
            'GET /async-error': rest({
                anonymous: true,
                resolve: async () => {
                    throw new Error('Test error');
                },
            }),
        });
        const { statusCode, body } = await request.get('/async-error').set('Content-Type', 'application/json');
        expect(statusCode).toEqual(500);
        expect(body).toEqual({ code: 'INTERNAL_ERROR' });
    });
});
