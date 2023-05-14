import { program } from 'commander';
import { generateEntities } from './generator';

program.name('untype-orm').description('CLI to work with ORM');

program
    .command('generate <directory>')
    .description('inspect database and generate entities')
    .option('-c, --connectionString <connectionString>', 'connection string')
    .requiredOption('-p, --port <port>', 'port')
    .option('-s, --schema <schema>', 'schema', 'public')
    .requiredOption('-n, --name <name>', 'name')
    .action(async (directory, options) => {
        return generateEntities({
            directory,
            schemaName: options.schema,
            connectionString: checkConnectionString(options),
        });
    });

const checkConnectionString = (options: any): string => {
    let connectionString = options.connectionString;
    if (!connectionString) {
        if (!options.name && !options.port) {
            throw new Error('You must provide either a connection string or a name and port');
        }

        connectionString = `postgres://${options.name}:${options.name}@localhost:${options.port}/${options.name}`;
    }

    return connectionString;
};

export const run = (args: string[]) => program.parse(args);

if (require.main === module) {
    run(process.argv);
}
