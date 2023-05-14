import { never } from '@untype/core';
import { untypeLogger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { cron } from '@untype/worker';
import { singleton } from 'tsyringe';

@singleton()
export class LogWorker {
    public constructor(private logger: untypeLogger, private pg: Pg) {}

    public ['test/DATE_DIFF'] = cron({
        pattern: '* * * * *',
        resolve: async () => {
            const date = new Date();

            type Row = { diff: { milliseconds: number } };

            const [diff = never()] = await this.pg.readonly.sql<Row>`
                SELECT now() - ${date} AS diff;
            `;

            this.logger.info('Date diff', { diff });
        },
    });
}
