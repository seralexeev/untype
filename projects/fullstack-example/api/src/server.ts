import { Container } from '@untype/core';
import { StdDumper } from '@untype/dumper';
import { untypeLogger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { createServer } from '@untype/rpc-express';
import { container as globalContainer } from 'tsyringe';
import { Config } from './config';
import { controllers } from './controllers';
import { Dumper } from './modules/common/Dumper';
import { TaskScheduler } from './modules/worker/TaskScheduler';
import { jobHandlers } from './modules/worker/handlers';

export const createApp = async () => {
    const config = await Config.load();
    const dumper = new Dumper();
    const logger = new untypeLogger({ ...config.logger, dumper });

    const inner = globalContainer.createChildContainer();
    const container = new Container(inner);

    inner.register(StdDumper, { useValue: dumper });
    inner.register(untypeLogger, { useValue: logger });
    inner.register(Container, { useValue: new Container(inner) });
    inner.register(Pg, { useValue: new Pg({ applicationName: 'fullstack-example', master: config.pg }) });
    inner.register(Config, { useValue: new Config(config) });

    const { app } = createServer({
        path: '/api',
        logger,
        container,
        controllers,
        includeErrorsResponse: config.server.includeErrorsResponse,
    });

    await container.resolve(TaskScheduler).run(jobHandlers, {
        cron: { enabled: true },
    });

    app.listen(config.server.port, () => {
        logger.info('Server listening on port 3000');
    });
};
