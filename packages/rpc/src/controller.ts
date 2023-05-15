import { BadRequestError, Class, Container, InternalError, UnauthorizedError, exists, trimToNull } from '@untype/core';
import { IncomingMessage, ServerResponse } from 'node:http';
import { MatchResult, match, pathToRegexp } from 'path-to-regexp';
import { z } from 'zod';
import { Endpoint } from './endpoint';
import { EndpointResponse } from './response';

type HandlerArgs = {
    req: IncomingMessage;
    res: ServerResponse;
    input: unknown;
    params: Record<string, string>;
    query: Record<string, string>;
};

type HandlerFunction = (args: HandlerArgs) => Promise<EndpointResponse>;
const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof httpMethodSchema>;

export type EndpointCollection = Record<string, Partial<Record<HttpMethod, EndpointHandler>>>;
export type EndpointHandler = {
    method: HttpMethod;
    handler: HandlerFunction;
    regexp: RegExp;
    match: (method: HttpMethod, path: string) => false | MatchResult;
};

export type ControllerOptions = {
    container: Container;
    controllers: Record<string, Class<unknown> | Record<string, unknown>>;
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
        instance: typeof controller === 'function' ? (container.resolve(controller) as Record<string, unknown>) : controller,
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
                // auth is being called even if anonymous is true
                // it allows us to use optional auth in some cases
                const auth = await invoker.auth(args);
                if (!config.anonymous && !auth) {
                    await onUnauthorized(args);
                }

                const { req, res, query, params } = args;
                let input = args.input;

                if (config.input) {
                    const inputParsed = config.input.safeParse(input);
                    input = inputParsed.success ? inputParsed.data : await onInputValidationError(inputParsed.error, args);
                }

                const result = await invoker.invoke({
                    resolve: (ctx) => {
                        return config.resolve({
                            ctx: ctx ? { ...ctx, auth } : { auth },
                            input,
                            query,
                            params,
                        });
                    },
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

            const regexp = pathToRegexp(path, [], {
                strict: false,
                sensitive: false,
                encode: encodeURIComponent,
            });

            const matchFn = match(path, { decode: decodeURIComponent });

            collection[httpMethod] = {
                method: httpMethod,
                handler,
                regexp,
                match: (method: HttpMethod, path: string) => {
                    if (method !== httpMethod) {
                        return false;
                    }

                    return matchFn(path);
                },
            };
        }
    }

    const allEndpoints = Object.values(endpoints).flatMap((collection) => Object.values(collection));

    return {
        endpoints,
        match: (method: HttpMethod, path: string) => {
            for (const endpoint of allEndpoints) {
                const match = endpoint.match(method, path);
                if (match) {
                    return { endpoint, params: match.params as Record<string, string> };
                }
            }

            return null;
        },
    };
};

const introspectClassKey = ([name, value]: [name: string, value: unknown]) => {
    const path = trimToNull(name.toLocaleLowerCase());
    if (!path || !(value instanceof Endpoint)) {
        return null;
    }

    if (value.type === 'REST') {
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

    if (path.startsWith('/')) {
        throw new InternalError(`RPC endpoint "${path}" should not start with a leading slash`);
    }

    return { path: `/${path}`, httpMethod: 'POST' as const, config: value.config, Invoker: value.Invoker };
};
