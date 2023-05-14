import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { untypeLogger } from '@untype/logger';
import { Pg } from '@untype/pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Migrations } from './MigrationRunner';

describe('@find-my-ride/api migrations', () => {
    const logger = new untypeLogger({ level: 'error' });
    let container: StartedTestContainer;
    let pg: Pg;

    beforeAll(async () => {
        container = await new GenericContainer('ghcr.io/baosystems/postgis:15')
            .withExposedPorts(5432)
            .withEnvironment({ POSTGRES_PASSWORD: 'untype', POSTGRES_DB: 'untype', POSTGRES_USER: 'untype' })
            .start();

        pg = new Pg({
            master: `postgres://untype:untype@${container.getHost()}:${container.getMappedPort(5432)}/untype`,
        });
    }, 60_000);

    afterAll(async () => {
        await pg.close();
        await container.stop();
    }, 60_000);

    it('apply without errors', async () => {
        await new Migrations(logger, pg).run();

        const { output } = await container.exec(['pg_dump', '-s', '-U', 'untype', 'untype']);
        const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), { encoding: 'utf-8' });

        // Remove comments from schema to avoid issues with different environments
        // --
        // -- PostgreSQL database dump
        // --
        //
        // -- Dumped from database version 14.4 (Debian 14.4-1.pgdg110+1)
        // -- Dumped by pg_dump version 14.4 (Debian 14.4-1.pgdg110+1)
        expect(output.split('\n').slice(7).join('\n')).toEqual(schema);
    });
});
