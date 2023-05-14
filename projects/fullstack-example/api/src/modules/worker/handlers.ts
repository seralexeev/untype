import { LogWorker } from './LogWorker';

export type JobHandlers = typeof jobHandlers;

export const jobHandlers = {
    LogWorker,
};
