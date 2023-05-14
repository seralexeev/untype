import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

import { Pg } from './pg';

describe('Pg readonly replicas', () => {
    let container: StartedTestContainer;
    let pg: Pg;

    beforeAll(async () => {
        container = await new GenericContainer('ghcr.io/baosystems/postgis:14-3.2')
            .withExposedPorts(5432)
            .withEnvironment({ POSTGRES_USER: 'untype', POSTGRES_PASSWORD: 'untype', POSTGRES_DB: 'untype' })
            .start();

        const temp = new Pg({
            master: `postgres://untype:untype@${container.getHost()}:${container.getMappedPort(5432)}/untype`,
        });

        await temp.sql`CREATE ROLE untype_ro_1 WITH LOGIN PASSWORD 'untype'`;
        await temp.sql`GRANT pg_read_all_data TO untype_ro_1`;

        await temp.sql`CREATE ROLE untype_ro_2 WITH LOGIN PASSWORD 'untype'`;
        await temp.sql`GRANT pg_read_all_data TO untype_ro_2`;

        await temp.close();

        pg = new Pg({
            master: `postgres://untype:untype@${container.getHost()}:${container.getMappedPort(5432)}/untype`,
            readonly: [
                `postgres://untype_ro_1:untype@${container.getHost()}:${container.getMappedPort(5432)}/untype`,
                `postgres://untype_ro_2:untype@${container.getHost()}:${container.getMappedPort(5432)}/untype`,
            ],
        });
    }, 60_000);

    afterAll(async () => {
        await pg.close();
        await container.stop();
    }, 60_000);

    it('round robin readonly replicas', async () => {
        let [result] = await pg.readonly.sql<{ current_user: string }>`SELECT current_user`;
        expect(result?.current_user).toBe('untype');

        [result] = await pg.readonly.sql<{ current_user: string }>`SELECT current_user`;
        expect(result?.current_user).toBe('untype_ro_1');

        [result] = await pg.readonly.transaction((t) => t.sql<{ current_user: string }>`SELECT current_user`);
        expect(result?.current_user).toBe('untype_ro_2');

        [result] = await pg.readonly.sql<{ current_user: string }>`SELECT current_user`;
        expect(result?.current_user).toBe('untype');

        [result] = await pg.readonly.query<{ current_user: string }>('SELECT current_user').then((x) => x.rows);
        expect(result?.current_user).toBe('untype_ro_1');

        [result] = await pg.readonly.connect((c) => c.query(`SELECT current_user`).then((x) => x.rows));
        expect(result?.current_user).toBe('untype_ro_2');

        [result] = await pg.readonly.sql<{ current_user: string }>`SELECT current_user`;
        expect(result?.current_user).toBe('untype');
    });

    it('master node by default', async () => {
        let [result] = await pg.sql<{ current_user: string }>`SELECT current_user`;
        expect(result?.current_user).toBe('untype');

        [result] = await pg.transaction((t) => t.sql<{ current_user: string }>`SELECT current_user`);
        expect(result?.current_user).toBe('untype');

        [result] = await pg.query<{ current_user: string }>('SELECT current_user').then((x) => x.rows);
        expect(result?.current_user).toBe('untype');

        [result] = await pg.connect((c) => c.query(`SELECT current_user`).then((x) => x.rows));
        expect(result?.current_user).toBe('untype');
    });
});
