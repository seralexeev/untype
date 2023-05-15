import { Logger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { MigrationRunner } from '@untype/migrations';

import { migrations } from './migrations';

export class Migrations {
    private runner;

    public constructor(logger: Logger, pg: Pg) {
        this.runner = new MigrationRunner(logger, pg);
    }

    public run = () => {
        return this.runner.run(migrations);
    };
}

const run = async () => {
    const logger = new Logger({ pretty: 'yaml' });
    const pg = new Pg({ master: 'postgres://untype:untype@localhost:5434/untype' });

    try {
        await new Migrations(logger, pg).run();
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
};

if (require.main === module) {
    void run();
}
