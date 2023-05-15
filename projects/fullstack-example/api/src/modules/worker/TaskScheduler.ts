import { Container } from '@untype/core';
import { Logger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { WorkerScheduler } from '@untype/worker';
import { singleton } from 'tsyringe';
import { JobHandlers } from './handlers';

@singleton()
export class TaskScheduler extends WorkerScheduler<JobHandlers> {
    public constructor(container: Container, logger: Logger, pg: Pg) {
        super(container, logger, pg);
    }
}
