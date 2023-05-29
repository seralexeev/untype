import { createWorker } from '@untype/worker';
import { LogWorker } from './modules/todo/LogWorker';

export const { schedule, startWorker } = createWorker({ LogWorker });
