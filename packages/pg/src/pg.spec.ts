import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

import { Pg } from './pg';

describe('Pg', () => {
    let container: StartedTestContainer;
    let pg: Pg;

    beforeAll(async () => {
        container = await new GenericContainer('ghcr.io/baosystems/postgis:14-3.2')
            .withExposedPorts(5432)
            .withEnvironment({ POSTGRES_USER: 'untype', POSTGRES_PASSWORD: 'untype', POSTGRES_DB: 'untype' })
            .start();

        pg = new Pg({
            master: `postgres://untype:untype@${container.getHost()}:${container.getMappedPort(5432)}/untype`,
        });
    }, 60_000);

    afterAll(async () => {
        await pg.close();
        await container.stop();
    }, 60_000);

    const tableExists = async (table: string) => {
        const [{ exists } = { exists: false }] = await pg.sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT FROM "information_schema"."tables" 
                WHERE "table_schema" = 'public'
                AND "table_name" = ${table}
            )
        `;

        return exists;
    };

    it('simple query in implicit transaction', async () => {
        const {
            rows: [{ value }],
        } = await pg.query('SELECT $1::int AS value', [1]);

        expect(value).toEqual(1);
    });

    it('simple query in explicit transaction', async () => {
        await pg.transaction(async (t) => {
            await t.sql`CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL)`;
            await t.sql`INSERT INTO users (name) VALUES ('alice')`;
            const alice = await t.sql`SELECT * FROM users`;

            expect(alice).toEqual([{ id: 1, name: 'alice' }]);
        });

        const alice = await pg.sql`SELECT * FROM users`;

        expect(alice).toEqual([{ id: 1, name: 'alice' }]);

        await pg.sql`DROP TABLE users`;
    });

    it('simple query in explicit transaction with rollback', async () => {
        await expect(async () => {
            await pg.transaction(async (t) => {
                await t.sql`CREATE TABLE users (id serial PRIMARY KEY, name text NOT NULL)`;
                await t.sql`INSERT INTO users (name) VALUES ('alice')`;

                throw new Error('rollback');
            });
        }).rejects.toThrow('rollback');

        expect(await tableExists('users')).toEqual(false);
    });
});
