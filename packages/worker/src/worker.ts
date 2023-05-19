import { ContainerType, InternalError, LoggerType, Merge, OmitNever } from '@untype/core';
import { Pg, Transaction } from '@untype/pg';
import {
    CronItem,
    CronItemOptions,
    JobHelpers,
    TaskSpec as LibTaskSpec,
    Logger,
    Task,
    TaskList,
    WorkerUtils,
    parseCronItems,
    run,
} from 'graphile-worker';
import { makeAddJob } from 'graphile-worker/dist/helpers';
import { Class } from 'type-fest';
import { z } from 'zod';
import { UnrecoverableWorkerError } from './errors';
import { createWorkerUtils } from './utils';

export const symbol = Symbol();
const isWorkerHandler = (value: unknown): value is HandlerMeta => {
    return typeof value === 'object' && value != null && symbol in value;
};

type ResolveFn<TArgs> = {
    resolve: (args: TArgs) => Promise<void> | void;
};

type WithInput<TInput, TArgs> = ResolveFn<TArgs & { input: TInput }> & {
    input: z.ZodType<TInput>;
};

type HandlerMeta = {
    [symbol]: {
        pattern?: string;
        enabled?: () => boolean;
        input?: z.ZodType;
        cronOptions?: CronItemOptions;
        resolve: (args: { input: unknown; helper: JobHelpers }) => unknown;
    };
};

export type Wrapper<T> = { [symbol]: T };

type CronHandler = { pattern: string; cronOptions?: CronItemOptions; enabled?: () => boolean };
type Context = { helper: JobHelpers };

export function worker<TInput>(config: WithInput<TInput, Context>): Wrapper<WithInput<TInput, Context>>;
export function worker(config: ResolveFn<Context>): Wrapper<ResolveFn<Context>>;
export function worker(config: any) {
    return {
        [symbol]: { ...config },
    };
}

export function cron(config: ResolveFn<Context> & CronHandler): Wrapper<ResolveFn<Context>> {
    return {
        [symbol]: { ...config },
    };
}

export type WorkerConfig = {
    concurrency?: number;
    cron?: { disabled?: boolean };
    forbiddenFlags?: string[];
};

type TaskSpec = Omit<LibTaskSpec, 'jobKey'> & {
    t?: Transaction;
    jobKey?: string | number | true;
};

export class WorkerScheduler<T extends Record<string, Class<any>>> {
    private workerUtils?: WorkerUtils;
    public taskNames: string[] = [];

    public constructor(private container: ContainerType, private logger: LoggerType, private pg: Pg) {}

    public get utils() {
        if (!this.workerUtils) {
            throw new InternalError('Worker is not initialized');
        }

        return this.workerUtils;
    }

    public schedule<K extends WithoutInputKeys<WorkerHandlerCollection<T>>>(job: K, args?: TaskSpec): Promise<void>;
    public schedule<K extends WithInputKeys<WorkerHandlerCollection<T>>>(
        job: K,
        args: { input: JobInput<T, K> } & TaskSpec,
    ): Promise<void>;
    public async schedule(job: string, { input, jobKey, t, ...spec }: { input?: unknown } & TaskSpec = {}) {
        if (!this.workerUtils) {
            throw new InternalError('Worker is not initialized');
        }

        this.logger.info(`Scheduling job ${job}`, { input, jobKey, spec });

        if (jobKey === true) {
            jobKey = job;
        } else if (jobKey !== undefined) {
            jobKey = [job, jobKey].join('/');
        }

        const addJob = t ? makeAddJob({}, t.connect) : this.workerUtils.addJob;

        await addJob(job, input, { ...spec, jobKey });
    }

    public run = async (handlers: T, config: WorkerConfig = {}) => {
        const { concurrency } = config;
        const instances = Object.values(handlers).map((x) => this.container.resolve(x) as Record<string, unknown>);
        const taskList: TaskList = {};
        const croneItems: CronItem[] = [];

        for (const instance of instances) {
            for (const [name, value] of Object.entries(instance)) {
                if (!isWorkerHandler(value)) {
                    continue;
                }

                this.taskNames.push(name);

                if (name in taskList) {
                    throw new InternalError(`The worker has registered already: ${name}`);
                }

                const { resolve, input: inputShape, pattern, cronOptions, enabled } = value[symbol];

                const task: Task = async (payload, helper) => {
                    this.logger.info(`Executing job ${name}`, { name, payload });

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
                            this.logger.error('Excluding the job from queue as the error is not recoverable', {
                                error,
                                name,
                                payload,
                            });
                        } else {
                            this.logger.error('Unable to handle worker action', { error, name, payload });
                            throw new VerboseError(JSON.stringify(this.logger.dump(error)));
                        }
                    }
                };

                taskList[name] = task;

                if (config.cron?.disabled !== true && pattern) {
                    if (enabled && !enabled()) {
                        this.logger.info(`Job ${name} skipped due to enabled function`, { name });
                        continue;
                    }

                    croneItems.push({ pattern, task: name, options: cronOptions });
                }
            }
        }

        this.workerUtils = await createWorkerUtils(this.pg);

        return run({
            pgPool: this.pg.master.pool,
            logger: new Logger((scope) => (level, message, meta) => {
                const logLevel = level === 'warning' ? 'warn' : level;
                if (level !== 'debug') {
                    this.logger[logLevel](message, { meta, scope });
                }
            }),
            parsedCronItems: parseCronItems(croneItems),
            taskList,
            concurrency,
        });
    };
}

export class VerboseError extends Error {
    public constructor(public error: string) {
        super(JSON.stringify(error));

        this.name = 'VerboseError';
    }
}

type WorkerHandler<T> = OmitNever<{
    [K in keyof T]: T[K] extends { [symbol]: WithInput<infer TInput, any> }
        ? { input: TInput }
        : T[K] extends { [symbol]: ResolveFn<any> }
        ? { input: never }
        : never;
}>;

type JobInput<T, K extends keyof WorkerHandlerCollection<T>> = WorkerHandlerCollection<T>[K] extends { input: infer TInput }
    ? TInput
    : never;

type WorkerHandlerCollection<T> = Merge<
    { [K in keyof T]: T[K] extends Class<any> ? WorkerHandler<InstanceType<T[K]>> : never }[keyof T]
>;

type WithInputKeys<T extends WorkerHandlerCollection<any>> = {
    [K in keyof T]: T[K]['input'] extends never ? never : K;
}[keyof T];
type WithoutInputKeys<T extends WorkerHandlerCollection<any>> = {
    [K in keyof T]: T[K]['input'] extends never ? K : never;
}[keyof T];
