import { Container } from '@untype/core';
import { StdDumper } from '@untype/dumper';
import { Logger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { ExpressServer } from '@untype/rpc-express';
import { container } from 'tsyringe';
import { Config } from './config';
import { controllers } from './controllers';
import { Dumper } from './modules/common/Dumper';
import { startWorker } from './worker';

export const createApp = async () => {
    const config = await Config.load();
    const dumper = new Dumper();
    const logger = new Logger({ ...config.logger, dumper });
    const pg = new Pg({ applicationName: 'fullstack-example', master: config.pg });

    container.register(StdDumper, { useValue: dumper });
    container.register(Logger, { useValue: logger });
    container.register(Container, { useValue: container });
    container.register(Pg, { useValue: pg });
    container.register(Config, { useValue: config });

    const { app } = new ExpressServer().createServer({
        path: '/api',
        container,
        controllers,
    });

    await startWorker({ container, logger, pg });

    app.listen(config.server.port, () => {
        logger.info('Server listening on port 3000');
    });
};
