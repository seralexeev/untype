import { IncomingMessage, ServerResponse } from 'node:http';

import { BadRequestError, Class, Container, InternalError, UnauthorizedError, exists, trimToNull } from '@untype/core';
import { z } from 'zod';

import { RestEndpoint, RpcEndpoint } from './endpoint';
import { EndpointResponse } from './response';

type HandlerArgs = { req: IncomingMessage; res: ServerResponse; input: unknown };
type HandlerFunction = (args: HandlerArgs) => Promise<EndpointResponse>;
const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof httpMethodSchema>;
export type EndpointCollection = Record<string, Partial<Record<HttpMethod, { handler: HandlerFunction }>>>;

export type ControllerOptions = {
    container: Container;
    controllers: Record<string, Class<unknown>>;
    onOutputValidationError?: (error: unknown, args: HandlerArgs) => unknown;
    onInputValidationError?: (error: unknown, args: HandlerArgs) => unknown;
    onUnauthorized?: (args: HandlerArgs) => unknown;
};

const onOutputValidationErrorDefault: ControllerOptions['onOutputValidationError'] = async (cause) => {
    throw new InternalError('Output Validation Error', { cause });
};

const onInputValidationErrorDefault: ControllerOptions['onInputValidationError'] = async (cause) => {
    throw new BadRequestError('Input Validation Error', { cause });
};

const onUnauthorizedDefault: ControllerOptions['onUnauthorized'] = async () => {
    throw new UnauthorizedError('Unauthorized');
};

export const makeControllerHandlers = (options: ControllerOptions) => {
    const {
        container,
        controllers,
        onInputValidationError = onInputValidationErrorDefault,
        onOutputValidationError = onOutputValidationErrorDefault,
        onUnauthorized = onUnauthorizedDefault,
    } = options;

    const endpoints: EndpointCollection = {};

    const instances = Object.values(controllers).map((controller) => ({
        instance: container.resolve(controller) as Record<string, unknown>,
        controller,
    }));

    for (const { instance } of instances) {
        for (const entry of Object.entries(instance)) {
            const result = introspectClassKey(entry);
            if (!result) {
                continue;
            }

            const { Invoker, config, httpMethod, path } = result;

            // Invoker can be a class or an instance
            // - class if use endpoint factory
            // - instance when we use Invoker inheritance and protected methods
            const invoker = typeof Invoker === 'function' ? container.resolve(Invoker) : Invoker;

            const handler: HandlerFunction = async (args) => {
                const { req, res } = args;
                let input = args.input;
                // auth is being called even if anonymous is true
                // it allows us to use optional auth in some cases
                const auth = await invoker.auth(args);
                if (!config.anonymous && !auth) {
                    await onUnauthorized(args);
                }

                if (config.input) {
                    const inputParsed = config.input.safeParse(input);
                    input = inputParsed.success ? inputParsed.data : await onInputValidationError(inputParsed.error, args);
                }

                const result = await invoker.invoke({
                    resolve: (ctx) => config.resolve({ ctx: ctx ? { ...ctx, auth } : { auth }, input }),
                    input,
                    auth,
                    req,
                    res,
                    config,
                    endpoint: path,
                });

                let output = result;

                if (result instanceof EndpointResponse) {
                    return result;
                }

                if (config.output) {
                    const outputParsed = config.output.safeParse(output);
                    output = outputParsed.success ? outputParsed.data : await onOutputValidationError(outputParsed.error, args);
                }

                return invoker.onRawOutput(output);
            };

            const collection = (endpoints[path] ??= {});
            if (collection[httpMethod]) {
                throw new InternalError(`Duplicate endpoint ${httpMethod} ${path}`);
            }

            collection[httpMethod] = { handler };
        }
    }

    return { endpoints };
};

const introspectClassKey = ([name, value]: [name: string, value: unknown]) => {
    const path = trimToNull(name.toLocaleLowerCase());
    if (!path) {
        return null;
    }

    if (value instanceof RestEndpoint) {
        // REST endpoint names can be prefixed with the HTTP method otherwise it defaults to GET:
        // - ['/users']
        // - ['GET /users']
        // - ['POST /users']
        const parts = path.split(' ').filter(exists);
        if (!parts.at(-1)?.startsWith('/')) {
            throw new InternalError(`REST endpoint "${path}" is missing a leading slash`);
        }

        const [methodOrPath, maybePath] = parts;

        if (!methodOrPath) {
            throw new InternalError(`Invalid REST endpoint: ${name}`);
        }

        if (methodOrPath && maybePath) {
            const httpMethodParseResult = httpMethodSchema.safeParse(methodOrPath.toUpperCase());
            if (!httpMethodParseResult.success) {
                throw new InternalError(`Invalid HTTP method: ${methodOrPath} for ${name}`, {
                    cause: httpMethodParseResult.error,
                });
            }

            return { path: maybePath, httpMethod: httpMethodParseResult.data, config: value.config, Invoker: value.Invoker };
        }

        return { path: methodOrPath, httpMethod: 'GET' as const, config: value.config, Invoker: value.Invoker };
    }

    if (value instanceof RpcEndpoint) {
        if (path.startsWith('/')) {
            throw new InternalError(`RPC endpoint "${path}" should not start with a leading slash`);
        }

        return { path: `/${path}`, httpMethod: 'POST' as const, config: value.config, Invoker: value.Invoker };
    }

    return null;
};
