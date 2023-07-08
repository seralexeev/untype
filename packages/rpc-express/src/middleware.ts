import { BadRequestError, Class, ContainerType, InternalError, ServiceError } from '@untype/core';
import { HttpMethod, introspectControllers } from '@untype/rpc';
import cookieParser from 'cookie-parser';
import express, { Express, NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

export class ExpressServer {
    protected get fileSizeLimit() {
        return 50 * 1024 * 1024;
    }

    protected get requestSizeLimit() {
        return 50 * 1024 * 1024;
    }

    public createServer = (options: {
        path?: string;
        container: ContainerType;
        controllers: Record<string, Class<unknown> | Record<string, unknown>>;
    }) => {
        const app = express();
        const { match, endpoints, methods } = introspectControllers(options.container, options.controllers);

        this.onBeforeRouter(app);

        app.use(options.path ?? '/', async (req, res, next) => {
            const matched = match(req.method as HttpMethod, req.path);
            if (!matched) {
                return next();
            }

            const { executor, config, params, name } = matched;

            try {
                // handle file uploads
                const file = Array.isArray(req.files) ? req.files[0] : null;
                const result = await executor.handle({
                    name,
                    config,
                    params,
                    req,
                    res,
                    input: file ?? req.body,
                    query: req.query as Record<string, string>, // TODO: fix this type
                });

                if (result) {
                    await result.write({ res, req });
                }
            } catch (error) {
                next(error);
            }
        });

        this.onAfterRouter(app);

        app.use(this.errorHandler);

        return {
            app,
            endpoints,
            methods,
            start: (port: number) => app.listen(port),
        };
    };

    protected onBeforeRouter = (app: Express) => {
        app.disable('x-powered-by');
        app.disable('etag');
        app.use(cookieParser());
        app.use(express.json({ verify: (req, _, buf) => (req.rawBody = buf), limit: this.requestSizeLimit }));
        app.use(multer({ limits: { fileSize: this.fileSizeLimit } }).any());
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onAfterRouter = (app: Express) => {
        // noop
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected errorHandler = (error: unknown, req: Request, res: Response, next: NextFunction) => {
        const serviceError = this.normalizeError(error);

        res.status(serviceError.statusCode()).json(serviceError);
    };

    private normalizeError = (error: unknown): ServiceError => {
        if (error) {
            if (error instanceof ServiceError) {
                return error;
            }

            if (error instanceof ZodError) {
                return new BadRequestError('Validation Error', { cause: error });
            }

            if (typeof error === 'object' && 'statusCode' in error && error.statusCode === 400) {
                return new BadRequestError('Bad Request', { cause: error });
            }
        }

        return new InternalError('Internal Error', { cause: error });
    };
}

declare module 'http' {
    export interface IncomingMessage {
        rawBody: Buffer;
    }
}
