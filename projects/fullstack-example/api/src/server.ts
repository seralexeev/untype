import { Container } from '@untype/core';
import { StdDumper } from '@untype/dumper';
import { Logger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { createServer } from '@untype/rpc-express';
import { container } from 'tsyringe';
import { Config } from './config';
import { controllers } from './controllers';
import { Dumper } from './modules/common/Dumper';
import { TaskScheduler } from './modules/worker/TaskScheduler';
import { jobHandlers } from './modules/worker/handlers';

export const createApp = async () => {
    const config = await Config.load();
    const dumper = new Dumper();
    const logger = new Logger({ ...config.logger, dumper });

    container.register(StdDumper, { useValue: dumper });
    container.register(Logger, { useValue: logger });
    container.register(Container, { useValue: container });
    container.register(Pg, { useValue: new Pg({ applicationName: 'fullstack-example', master: config.pg }) });
    container.register(Config, { useValue: config });

    const { app } = createServer({
        path: '/api',
        logger,
        container,
        controllers,
        includeErrorsResponse: config.server.includeErrorsResponse,
    });

    await container.resolve(TaskScheduler).run(jobHandlers);

    app.listen(config.server.port, () => {
        logger.info('Server listening on port 3000');
    });
};
