import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import { parse, resolve } from 'node:path';

import { exists } from '@untype/core';
import { z } from 'zod';

export const createMigration = async ({ directory, name }: { name: string; directory: string }) => {
    const migrations = await getAllMigrations(directory);
    if (migrations.length === 0) {
        await createMigrationImpl({
            directory,
            name: 'init',
            content: initialMigration,
        });

        await createTest(directory);
    }

    return createMigrationImpl({ directory, name });
};

const createMigrationImpl = async ({ directory, name, content }: { name: string; directory: string; content?: string }) => {
    const migrations = await getAllMigrations(directory);
    const lastMigration = migrations[0];
    const nextId = lastMigration ? lastMigration.id + 1 : 1;
    const nextFileName = nextId.toString().padStart(3, '0') + '_' + name + '.ts';

    await fs.writeFile(`${directory}/${nextFileName}`, template(content));
    await regenerateMigrationList({ directory });
};

export const regenerateMigrationList = async ({ directory }: { directory: string }) => {
    const migrations = await getAllMigrations(directory);
    migrations.sort((a, b) => a.id - b.id);

    let body = 'export const migrations: MigrationList = [\n';
    body += migrations.map((x) => `    { id: ${x.id}, name: '${x.name}', apply: ${x.name}_${x.id} },`).join('\n');
    body += '\n];';

    const imports = migrations.map((x) => `import ${x.name}_${x.id} from './${x.fileName}';`).join('\n');

    const migrationsFileContent = migrationsTemplate(imports + '\n\n' + body);

    await fs.writeFile(`${directory}/migrations.ts`, migrationsFileContent);

    if (!(await fileExists(`${directory}/MigrationRunner.ts`))) {
        await fs.writeFile(`${directory}/MigrationRunner.ts`, migrationRunner);
    }
};

const getAllMigrations = async (directory: string) => {
    const dirExists = await fileExists(directory);
    if (!dirExists) {
        await fs.mkdir(directory, { recursive: true });
    }

    const files = await fs.readdir(directory, { withFileTypes: true });
    const migrations = files
        .map((x) => {
            if (!x.isFile()) {
                return null;
            }

            const { name: fileName } = parse(x.name);
            switch (fileName) {
                case 'index':
                case 'MigrationRunner':
                case 'migrations':
                case 'migrations.spec':
                case 'schema':
                    return null;
            }

            if (!x.name.match(/^\d+_\w+\.ts$/)) {
                throw new Error(`Migration file has unexpected name: ${x.name}`);
            }

            const [idStr, name] = fileName.split('_');
            const id = z.preprocess((x) => Number(x), z.number().int().positive()).parse(idStr);
            z.string().min(1).parse(name);

            return { id, idStr, name, fileName };
        })
        .filter(exists);

    migrations.sort((a, b) => b.id - a.id);

    return migrations;
};

const createTest = async (directory: string) => {
    const packageJsonPath = resolve(`${directory}/../../package.json`);
    const packageName = (await fileExists(packageJsonPath))
        ? await fs.readFile(resolve(`${directory}/../../package.json`), 'utf-8').then((x) => JSON.parse(x).name)
        : 'unknown-migration';

    await fs.writeFile(`${directory}/migrations.spec.ts`, testTemplate(packageName));
};

const testTemplate = (packageName: string) => `import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { Logger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Migrations } from './MigrationRunner';

describe('${packageName} migrations', () => {
    const logger = new Logger({ level: 'error' });
    let container: StartedTestContainer;
    let pg: Pg;

    beforeAll(async () => {
        container = await new GenericContainer('ghcr.io/baosystems/postgis:14-3.2')
            .withExposedPorts(5432)
            .withEnvironment({ POSTGRES_PASSWORD: 'untype', POSTGRES_DB: 'untype', POSTGRES_USER: 'untype' })
            .start();

        pg = new Pg({
            master: \`postgres://untype:untype@\${container.getHost()}:\${container.getMappedPort(5432)}/untype\`
        });
    }, 60_000);

    afterAll(async () => {
        await pg.close();
        await container.stop();
    }, 60_000);

    it('apply without errors', async () => {
        await new Migrations(logger, pg).run();
    });
});
`;

const fileExists = (path: string) => {
    return fs
        .access(path, constants.R_OK)
        .then(() => true)
        .catch(() => false);
};

const migrationsTemplate = (body: string) => `/* prettier-ignore */
/**
 * This file was auto-generated please do not modify it!
 */

import { MigrationList } from '@untype/migrations';

${body}
`;

const template = (content?: string) => `import { Transaction } from '@untype/pg';

export default async (t: Transaction) => {
    ${content ?? 'await t.sql``;'}
};
`;

const initialMigration = `await t.sql\`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"\`;
    await t.sql\`
        CREATE OR REPLACE FUNCTION trigger_set_updated_at()
        RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = clock_timestamp();
                RETURN NEW;
            END;
        $$ LANGUAGE plpgsql
    \`;`;

const migrationRunner = `import { Logger, logger } from '@untype/logger';
import { MigrationRunner } from '@untype/migrations';
import { Pg } from '@untype/pg';

import { migrations } from './migrations';

export class Migrations {
    private runner;

    public constructor(logger: Logger, pg: Pg) {
        this.runner = new MigrationRunner(logger, pg);
    }

    public run = () => {
        return this.runner.run(migrations);
    };

    public static apply = async () => {
        const master = process.env.MIGRATIONS_CONNECTION_STRING;
        if (!master) {
            throw new Error('MIGRATIONS_CONNECTION_STRING must be set');
        }

        const pg = new Pg({ master });
        await new Migrations(logger, pg).run();

        process.exit(0);
    };
}

if (require.main === module) {
    Migrations.apply().catch(() => process.exit(1));
}
`;
