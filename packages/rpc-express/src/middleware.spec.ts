import 'reflect-metadata';
import 'source-map-support/register';

import { beforeAll, describe, expect, it } from '@jest/globals';
import { HttpContext, SimpleInvoker } from '@untype/rpc';
import { Express } from 'express';
import request from 'supertest';
import { container, singleton } from 'tsyringe';
import { z } from 'zod';

import { createServer } from './middleware';

describe('SimpleInvoker', () => {
    let server: { app: Express };

    beforeAll(() => {
        server = createServer({
            container,
            controllers: { RestController, RpcController },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            logger: { dump: () => {}, error: () => {} },
        });
    });

    it('GET /value returns expected', async () => {
        const { body, statusCode, headers } = await request(server.app).get('/value').set('Content-Type', 'application/json');

        expect(body).toEqual(1);
        expect(statusCode).toEqual(200);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('POST /value returns expected', async () => {
        const { body, statusCode, headers } = await request(server.app).post('/value').set('Content-Type', 'application/json');

        expect(body).toEqual(1);
        expect(statusCode).toEqual(200);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('POST /value validates input and strips extra fields', async () => {
        const { body, statusCode, headers } = await request(server.app)
            .post('/object')
            .send({ value: 1, extra: 'extra' })
            .set('Content-Type', 'application/json');

        expect(body).toEqual({ value: 1 });
        expect(body.extra).toBeUndefined();
        expect(statusCode).toEqual(200);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('POST /value validates input', async () => {
        const { statusCode, headers } = await request(server.app)
            .post('/object')
            .send({})
            .set('Content-Type', 'application/json');

        expect(statusCode).toEqual(400);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('POST /invalid_output throws exception', async () => {
        const { statusCode, headers } = await request(server.app)
            .post('/invalid_output')
            .set('Content-Type', 'application/json');

        expect(statusCode).toEqual(500);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('POST /auth_required checks auth (200)', async () => {
        const { statusCode, headers, body } = await request(server.app)
            .post('/auth_required')
            .set('Content-Type', 'application/json')
            .set('x-auth', 'true');

        expect(statusCode).toEqual(200);
        expect(body).toEqual(true);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    it('POST /auth_required checks auth (401)', async () => {
        const { statusCode, headers } = await request(server.app)
            .post('/auth_required')
            .set('Content-Type', 'application/json');

        expect(statusCode).toEqual(401);
        expect(headers['content-type']).toEqual('application/json; charset=utf-8');
    });
});

@singleton()
class RestController extends SimpleInvoker {
    public ['GET /value'] = this.rest({
        anonymous: true,
        resolve: () => 1,
    });

    public ['POST /value'] = this.rest({
        anonymous: true,
        resolve: () => 1,
    });

    public ['POST /object'] = this.rest({
        anonymous: true,
        input: z.object({ value: z.number() }),
        output: z.object({ value: z.number() }),
        resolve: ({ input }) => ({ ...input, extra: 'extra' }),
    });

    public ['POST /invalid_output'] = this.rest({
        anonymous: true,
        output: z.object({ value: z.number() }),
        resolve: () => ({ extra: 'extra' } as any),
    });

    public ['POST /auth_required'] = this.rest({
        resolve: ({ ctx }) => ctx.auth,
    });

    public override auth = async ({ req }: HttpContext) => {
        return req.headers['x-auth'] ? true : null;
    };
}

@singleton()
class RpcController extends SimpleInvoker {
    public ['rpc/value'] = this.rpc({
        anonymous: true,
        resolve: () => 1,
    });
}
