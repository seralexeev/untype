import { Pg } from '@untype/pg';
import { WorkerScheduler } from '@untype/worker';
import { Container } from '@untype/core';
import { untypeLogger } from '@untype/logger';
import { singleton } from 'tsyringe';
import { JobHandlers } from './handlers';

@singleton()
export class TaskScheduler extends WorkerScheduler<JobHandlers> {
    public constructor(container: Container, logger: untypeLogger, pg: Pg) {
        super(container, logger, pg);
    }
}
