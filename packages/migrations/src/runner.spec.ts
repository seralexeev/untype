import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { ConsoleLogger } from '@untype/core';
import { Pg } from '@untype/pg';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { MigrationRunner } from './runner';
import { ApplyCallback } from './types';

describe('Migration Runner', () => {
    const logger = new ConsoleLogger();
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

    afterEach(async () => {
        await pg.sql`DROP SCHEMA "public" CASCADE`;
        await pg.sql`CREATE SCHEMA "public"`;
        await pg.sql`COMMENT ON SCHEMA "public" IS 'standard public schema'`;
        await pg.sql`GRANT ALL ON SCHEMA "public" TO "untype"`;
        await pg.sql`GRANT ALL ON SCHEMA "public" TO "public"`;
    });

    afterAll(async () => {
        await pg.close();
        await container.stop();
    }, 60_000);

    const tableExists = async (table: string) => {
        const [{ exists } = { exists: false }] = await pg.sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = ${table}
            )
        `;

        return exists;
    };

    const ensureTable = async (table: string) => {
        const exists = await tableExists(table);
        if (!exists) {
            throw new Error(`Expected table to exist: ${table}`);
        }
    };

    const ensureNoTable = async (table: string) => {
        const exists = await tableExists(table);
        if (exists) {
            throw new Error(`Expected table to *NOT* exist: ${table}`);
        }
    };

    it('creates migration table', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([]);

        const migrations = await mr.getAppliedMigrations();
        expect(migrations).toHaveLength(0);
    });

    it('applies single migration', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` }]);

        const migrations = await mr.getAppliedMigrations();
        expect(migrations).toStrictEqual([{ created_at: expect.any(Date), id: 1, name: 'createUsers' }]);

        await ensureTable('users');
    });

    it('applies multiple migrations in a single run', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([
            { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
            { id: 2, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
        ]);

        const migrations = await mr.getAppliedMigrations();
        expect(migrations).toStrictEqual([
            { created_at: expect.any(Date), id: 1, name: 'createUsers' },
            { created_at: expect.any(Date), id: 2, name: 'createOrders' },
        ]);

        await ensureTable('users');
        await ensureTable('orders');
    });

    it('applies multiple migrations in multiple runs', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` }]);
        await mr.run([
            { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
            { id: 2, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
        ]);

        const migrations = await mr.getAppliedMigrations();
        expect(migrations).toStrictEqual([
            { created_at: expect.any(Date), id: 1, name: 'createUsers' },
            { created_at: expect.any(Date), id: 2, name: 'createOrders' },
        ]);

        await ensureTable('users');
        await ensureTable('orders');
    });

    it('handles parallel runs', async () => {
        const mr1 = new MigrationRunner(logger, pg);
        const mr2 = new MigrationRunner(logger, pg);

        let resolveLongSqlQuery = () => {
            // no op
        };

        let runMigrationPromise = Promise.resolve();

        await new Promise<void>((resolve) => {
            runMigrationPromise = mr1.run([
                {
                    id: 1,
                    name: 'createUsers',
                    apply: async (t) => {
                        resolve();
                        await t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)`;
                        // eslint-disable-next-line promise/param-names
                        return new Promise<void>((r) => (resolveLongSqlQuery = r));
                    },
                },
            ]);
        });

        await expect(
            mr2.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` }]),
        ).rejects.toThrow();

        resolveLongSqlQuery();
        await runMigrationPromise;

        await mr2.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` }]);

        await ensureTable('users');
    });

    it('fails if migration list changed', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` }]);
        await expect(
            mr.run([{ id: 2, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` }]),
        ).rejects.toThrow();

        await ensureTable('users');
        await ensureNoTable('orders');
    });

    it('fails if sql throws', async () => {
        const mr = new MigrationRunner(logger, pg);

        await expect(
            mr.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" incorrect PRIMARY KEY)` }]),
        ).rejects.toThrow();

        const migrations = await mr.getAppliedMigrations();
        expect(migrations).toStrictEqual([]);

        await ensureNoTable('users');
    });

    it('rollbacks applied transactions if sql throws within a run', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` }]);

        await expect(
            mr.run([
                { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
                { id: 2, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
                { id: 3, name: 'createRoles', apply: (t) => t.sql`CREATE TABLE "roles" ("id" incorrect PRIMARY KEY)` },
            ]),
        ).rejects.toThrow();

        const migrations = await mr.getAppliedMigrations();
        expect(migrations).toStrictEqual([{ created_at: expect.any(Date), id: 1, name: 'createUsers' }]);

        await ensureTable('users');
    });

    it('rollbacks query if sql throws within a run', async () => {
        const mr = new MigrationRunner(logger, pg);

        await expect(
            mr.run([
                {
                    id: 1,
                    name: 'createUsersAndOrders',
                    apply: async (t) => {
                        await t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)`;
                        await t.sql`CREATE TABLE "orders" ("id" incorrect PRIMARY KEY)`;
                    },
                },
            ]),
        ).rejects.toThrow();

        const migrations = await mr.getAppliedMigrations();
        expect(migrations).toStrictEqual([]);

        await ensureNoTable('users');
        await ensureNoTable('orders');
    });

    it('fails if id clash', async () => {
        const mr = new MigrationRunner(logger, pg);

        await expect(
            mr.run([
                { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
                { id: 1, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
            ]),
        ).rejects.toThrow();

        await ensureNoTable('users');
        await ensureNoTable('orders');
    });

    it('no error if name clash', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([
            { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
            { id: 2, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE IF NOT EXISTS "users" ("id" int PRIMARY KEY)` },
        ]);

        await ensureTable('users');
    });

    it('idempotent run', async () => {
        const mr = new MigrationRunner(logger, pg);

        for (let i = 0; i < 3; i++) {
            await mr.run([
                { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
                { id: 2, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
            ]);
        }

        await ensureTable('users');
        await ensureTable('orders');
    });

    it('throws if missing id', async () => {
        const mr = new MigrationRunner(logger, pg);

        await expect(
            mr.run([
                { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
                { id: 2, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
                { id: 4, name: 'createRoles', apply: (t) => t.sql`CREATE TABLE "roles" ("id" int PRIMARY KEY)` },
            ]),
        ).rejects.toThrow();

        await ensureNoTable('users');
        await ensureNoTable('orders');
        await ensureNoTable('roles');
    });

    it('missing migration', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([{ id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` }]);
        await expect(
            mr.run([
                { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
                { id: 3, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
            ]),
        ).rejects.toThrow();

        await ensureTable('users');
        await ensureNoTable('orders');
    });

    it('does not call applied migration', async () => {
        const mr = new MigrationRunner(logger, pg);

        await mr.run([
            { id: 1, name: 'createUsers', apply: (t) => t.sql`CREATE TABLE "users" ("id" int PRIMARY KEY)` },
            { id: 2, name: 'createOrders', apply: (t) => t.sql`CREATE TABLE "orders" ("id" int PRIMARY KEY)` },
        ]);

        const createUsers = jest.fn<ApplyCallback>();
        const createOrders = jest.fn<ApplyCallback>();
        const createRoles = jest.fn<ApplyCallback>(() => Promise.resolve());

        await mr.run([
            { id: 1, name: 'createUsers', apply: createUsers },
            { id: 2, name: 'createOrders', apply: createOrders },
            { id: 3, name: 'createRoles', apply: createRoles },
        ]);

        expect(createUsers).not.toHaveBeenCalled();
        expect(createOrders).not.toHaveBeenCalled();
        expect(createRoles).toHaveBeenCalled();
    });
});
