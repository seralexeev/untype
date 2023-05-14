import { Client, QueryResult } from 'pg';

type QueryFn = (queryTextOrConfig: string, values?: unknown) => Promise<QueryResult<any>>;

export const patchQuery = (logger: { debug: (message: string, data?: unknown) => void }) => {
    const notExplainable = ['SAVEPOINT', 'ROLLBACK', 'BEGIN', 'RELEASE', 'COMMIT', 'SHOW', 'LISTEN'];
    const query: QueryFn = Client.prototype.query;

    Client.prototype.query = async function (this: Client, text: any, values: any) {
        let logQuery: any = text;
        let logValues: any = values;

        if (typeof text === 'object') {
            logQuery = text.text;
            logValues = text.values;
        }

        const isNotExplainable = notExplainable.some((x) => logQuery.toUpperCase().startsWith(x));
        const logEntry: Record<string, unknown> = {
            query: logQuery,
            variables: Array.isArray(logValues) ? (logValues.length > 0 ? logValues : undefined) : logValues,
        };

        if (!isNotExplainable) {
            await query.call(this, 'BEGIN');
            await query.call(this, 'SAVEPOINT explain');
            await query
                .call(this, 'EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) ' + logQuery, logValues)
                .then((res: any) => {
                    logEntry.explain = res.rows.map((x: any) => x['QUERY PLAN']).join('\n');
                    return;
                })
                .catch((err: any) => {
                    logEntry.explain = err;
                });

            await query.call(this, 'ROLLBACK TO SAVEPOINT explain');
        }

        return query
            .call(this, text, values)
            .then((result: QueryResult) => {
                const resultLog: Record<string, unknown> = {};
                if (result.rowCount > 0) {
                    resultLog.rowCount = result.rowCount;
                }

                if (result.fields && result.fields.length > 0) {
                    resultLog.fields = result.fields;
                }

                logger.debug('🔎 SQL debug (success)', {
                    ...logEntry,
                    result: Object.keys(resultLog).length > 0 ? resultLog : undefined,
                });
                return result;
            })
            .catch((error: any) => {
                logger.debug('🔎 SQL debug (error)', { ...logEntry, error });
                throw error;
            });
    } as any;
};
