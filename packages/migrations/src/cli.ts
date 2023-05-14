import 'source-map-support/register';

import { program } from 'commander';
import { createMigration, regenerateMigrationList } from './generator';

program.name('untype-migrations').description('CLI to create and run PG migrations');

program
    .command('create <directory> <name>')
    .description('create migration')
    .action((directory, name) => createMigration({ directory, name }));

program
    .command('regenerate <directory>')
    .description('regenerate migrations list')
    .action((directory) => regenerateMigrationList({ directory }));

export const run = (args: string[]) => program.parse(args);

if (require.main === module) {
    run(process.argv);
}
