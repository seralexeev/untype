import { never } from '@untype/core';
import { Logger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { cron, task } from '@untype/worker';
import { singleton } from 'tsyringe';
import z from 'zod';

@singleton()
export class LogWorker {
    public constructor(private logger: Logger, private pg: Pg) {}

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

    public ['todo/SEND_EMAIL'] = task({
        input: z.object({ id: z.string() }),
        resolve: async ({ input }) => {
            this.logger.info('task', input);
        },
    });

    public ['test/COUNT_TODO'] = task({
        resolve: async () => {
            this.logger.info('task2');
        },
    });
}
