import { ContainerType, InternalError, LoggerType, Merge, OmitNever } from '@untype/core';
import { Pg, PgConnection } from '@untype/pg';
import {
    AddJobFunction,
    CronItem,
    CronItemOptions,
    JobHelpers,
    TaskSpec as LibTaskSpec,
    Logger,
    Task,
    TaskList,
    parseCronItems,
    run,
} from 'graphile-worker';
import { makeAddJob } from 'graphile-worker/dist/helpers';
import { Class } from 'type-fest';
import { z } from 'zod';
import { UnrecoverableWorkerError } from './errors';

type ResolveFn<TArgs> = {
    resolve: (args: TArgs) => Promise<void> | void;
};

type Context = { helper: JobHelpers };

class TaskHandler<T> {
    public constructor(
        public config: {
            pattern?: string;
            enabled?: () => boolean;
            input?: z.ZodType<T>;
            cronOptions?: CronItemOptions;
            resolve: (args: { input?: unknown } & Context) => Promise<void> | void;
        },
    ) {}
}

export function task<TInput>(
    config: ResolveFn<Context & { input: TInput }> & {
        input: z.ZodType<TInput>;
    },
): TaskHandler<TInput>;
export function task(config: ResolveFn<Context>): TaskHandler<never>;
export function task(config: any): any {
    return new TaskHandler(config);
}

export function cron(
    config: ResolveFn<Context> & {
        pattern: string;
        cronOptions?: CronItemOptions;
        enabled?: () => boolean;
    },
): TaskHandler<never> {
    return new TaskHandler(config);
}

export type WorkerConfig = {
    concurrency?: number;
    cron?: { disabled?: boolean };
    forbiddenFlags?: string[];
};

type TaskSpec = Omit<LibTaskSpec, 'jobKey'> & {
    jobKey?: string | number | true;
};

export const createWorker = <T extends Record<string, Class<any>>>(handlers: T) => {
    async function schedule(
        pg: PgConnection,
        job: WorkerHandlerCollection<T>[keyof WorkerHandlerCollection<T>] & { key: string },
        { jobKey, ...spec }: TaskSpec = {},
    ) {
        if (!pg.data.addJob) {
            pg.data.addJob = makeAddJob({}, pg.connect);
        }

        const addJob = pg.data.addJob as AddJobFunction;

        if (jobKey === true) {
            jobKey = job.key;
        } else if (jobKey !== undefined) {
            jobKey = [job, jobKey].join('/');
        }

        await addJob(job.key, (job as any).input, { ...spec, jobKey });
    }

    const startWorker = async ({
        pg,
        container,
        logger,
        config = {},
    }: {
        pg: Pg;
        container: ContainerType;
        logger: LoggerType;
        config?: WorkerConfig;
    }) => {
        const { concurrency } = config;
        const instances = Object.values(handlers).map((x) => container.resolve(x) as Record<string, unknown>);
        const taskList: TaskList = {};
        const croneItems: CronItem[] = [];

        for (const instance of instances) {
            for (const [name, value] of Object.entries(instance)) {
                if (!(value instanceof TaskHandler)) {
                    continue;
                }

                if (name in taskList) {
                    throw new InternalError(`The worker has registered already: ${name}`);
                }

                const { resolve, input: inputShape, pattern, cronOptions, enabled } = value.config;

                const task: Task = async (payload, helper) => {
                    logger.info(`Executing job ${name}`, { name, payload });

                    let input: unknown;
                    if (inputShape) {
                        const inputParsed = inputShape.safeParse(payload);
                        if (!inputParsed.success) {
                            const cause = inputParsed.error;
                            Object.defineProperty(cause, 'message', { get: () => 'Parse Error' });
                            throw new InternalError('Validation Error', { cause });
                        }

                        input = inputParsed.data;
                    }

                    try {
                        await resolve({ input, helper });
                    } catch (error) {
                        if (error instanceof UnrecoverableWorkerError) {
                            logger.error('Excluding the job from queue as the error is not recoverable', {
                                error,
                                name,
                                payload,
                            });
                        } else {
                            logger.error('Unable to handle worker action', { error, name, payload });
                            throw new VerboseError(JSON.stringify(logger.dump(error)));
                        }
                    }
                };

                taskList[name] = task;

                if (config.cron?.disabled !== true && pattern) {
                    if (enabled && !enabled()) {
                        logger.info(`Job ${name} skipped due to enabled function`, { name });
                        continue;
                    }

                    croneItems.push({ pattern, task: name, options: cronOptions });
                }
            }
        }

        return run({
            pgPool: pg.master.pool,
            logger: new Logger((scope) => (level, message, meta) => {
                const logLevel = level === 'warning' ? 'warn' : level;
                if (level !== 'debug') {
                    logger[logLevel](message, { meta, scope });
                }
            }),
            parsedCronItems: parseCronItems(croneItems),
            taskList,
            concurrency,
        });
    };

    return {
        schedule,
        startWorker,
    };
};

export class VerboseError extends Error {
    public constructor(public error: string) {
        super(JSON.stringify(error));

        this.name = 'VerboseError';
    }
}

type WorkerHandler<T> = {
    [K in keyof T]: T[K] extends TaskHandler<infer Q> ? ([Q] extends [never] ? { key: K } : { key: K; input: Q }) : never;
};

export type WorkerHandlerCollection<T> = OmitNever<
    Merge<{ [K in keyof T]: T[K] extends Class<any> ? WorkerHandler<InstanceType<T[K]>> : never }[keyof T]>
>;
