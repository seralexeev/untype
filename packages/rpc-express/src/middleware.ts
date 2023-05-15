import { BadRequestError, Class, ContainerType, InternalError, ServiceError } from '@untype/core';
import { HttpMethod, makeControllerHandlers } from '@untype/rpc';
import cookieParser from 'cookie-parser';
import express, { ErrorRequestHandler, Express, NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

type ControllerOptions = {
    container: ContainerType;
    controllers: Record<string, Class<unknown> | Record<string, unknown>>;
};

export const createControllers = (options: ControllerOptions) => {
    const { endpoints, match } = makeControllerHandlers(options);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
        const result = match(req.method as HttpMethod, req.path);
        if (!result) {
            return next();
        }

        const { endpoint, params } = result;
        try {
            // handle file uploads
            const file = Array.isArray(req.files) ? req.files[0] : null;
            const result = await endpoint.handler({
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
    };

    handler.endpoints = endpoints;

    return handler;
};

export const useController = (app: Express, options: ControllerOptions & { path?: string }) => {
    const handler = createControllers(options);

    app.use(options.path ?? '/', handler);

    return {
        endpoints: handler.endpoints,
    };
};

const useErrorHandler = (
    app: Express,
    {
        logger,
        includeErrorsResponse = false,
        logAllErrors = false,
    }: {
        logger: MinimalLogger;
        includeErrorsResponse?: boolean;
        logAllErrors?: boolean;
    },
) => {
    // should be exactly 4 arguments
    const errorHandler: ErrorRequestHandler = (error, req, res, _) => {
        // TODO: remove this unsafe block
        const includeError = includeErrorsResponse || Boolean(req.headers['x-enable-error-serialization']);

        // handle some standard errors
        if (!(error instanceof ServiceError)) {
            if (error.statusCode === 400) {
                error = new BadRequestError(error.message, { cause: error });
            } else if (error instanceof ZodError) {
                error = new BadRequestError('Validation Error', { cause: error });
            } else {
                error = new InternalError(error.message, { cause: error });
            }
        }

        if (logAllErrors || error.shouldLog()) {
            logger.error(error.message, error);
        }

        const data = includeError ? logger.dump(error) : { code: error.code, message: error.publicMessage };

        res.status(error.statusCode()).json(data);
    };

    app.use(errorHandler);
};

export const createServer = (
    options: ControllerOptions & {
        path?: string;
        requestSizeLimit?: number;
        fileSizeLimit?: number;
        logger: MinimalLogger;
        includeErrorsResponse?: boolean;
        logAllErrors?: boolean;
    },
) => {
    const app = express();

    app.disable('x-powered-by');
    app.disable('etag');
    app.use(cookieParser());
    app.use(express.json({ verify: (req, _, buf) => (req.rawBody = buf), limit: options.requestSizeLimit }));
    app.use(multer({ limits: { fileSize: options.fileSizeLimit } }).any());

    const { endpoints } = useController(app, options);
    useErrorHandler(app, options);

    return {
        app,
        endpoints,
        start: (port: number) => app.listen(port),
    };
};

type MinimalLogger = {
    error: (message: string, error: unknown) => void;
    dump: (obj: unknown) => unknown;
};

declare module 'http' {
    export interface IncomingMessage {
        rawBody: Buffer;
    }
}
