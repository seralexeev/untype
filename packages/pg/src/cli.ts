import { program } from 'commander';

import { $ } from '@untype/core/node';
import fs from 'node:fs/promises';
import { join } from 'node:path';

program.name('untype-pg').description('CLI to work with pg');

program
    .command('schema <directory> <name>')
    .description('dumps schema')
    .action(async (directory, name) => {
        const output = await $`docker exec ${name} pg_dump -s -U ${name} ${name}`;
        await fs.writeFile(join(directory, 'schema.sql'), output.split('\n').slice(7).join('\n'));
    });

program
    .command('reset')
    .requiredOption('-p, --port <port>', 'port')
    .requiredOption('-n, --name <name>', 'name')
    .description('reset development server')
    .action(async ({ name, port }) => {
        await $`docker rm -f ${name} || true`;
        await $`docker run -d --name ${name} -e POSTGRES_DB=${name} -e POSTGRES_USER=${name} -e POSTGRES_PASSWORD=${name} -p ${port}:5432 ghcr.io/baosystems/postgis:15`;
        await $`until docker exec ${name} pg_isready ; do sleep 1 ; done`;
        await $`sleep 3`;
    });

export const run = (args: string[]) => program.parse(args);

if (require.main === module) {
    run(process.argv);
}
