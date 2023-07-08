import { Class, ContainerType, InternalError, exists, trimToNull } from '@untype/core';
import { MatchResult, match as matchRegexp, pathToRegexp } from 'path-to-regexp';
import { Endpoint, EndpointConfig } from './endpoint';
import { Executor } from './executor';
import { HttpMethod, HttpMethodSchema } from './types';

type EndpointMeta = {
    name: string;
    method: HttpMethod;
    regexp: RegExp;
    match: (path: string) => false | MatchResult;
    executor: Executor<any, any, any, any, any>;
    config: EndpointConfig<any, any, any, any, any, any, any>;
};

export const introspectControllers = (
    container: ContainerType,
    controllers: Record<string, Class<unknown> | Record<string, unknown>>,
) => {
    const endpoints: Record<string, Partial<Record<HttpMethod, EndpointMeta>>> = {};
    const methods: Partial<Record<HttpMethod, EndpointMeta[]>> = {};

    const instances = Object.values(controllers).map((controller) => {
        return typeof controller === 'function' ? (container.resolve(controller) as Record<string, unknown>) : controller;
    });

    for (const instance of Object.values(instances)) {
        for (const entry of Object.entries(instance)) {
            const result = introspectClassKey(entry);
            if (!result) {
                continue;
            }

            const { method, name, Executor, config } = result;

            const regexp = pathToRegexp(name, [], {
                strict: false,
                sensitive: false,
                encode: encodeURIComponent,
            });

            const matchFn = matchRegexp(name, { decode: decodeURIComponent });

            const meta = {
                name,
                method,
                regexp,
                config,
                match: (path: string) => matchFn(path),
                executor: typeof Executor === 'function' ? container.resolve(Executor) : Executor,
            };

            const collection = (endpoints[name] ??= {});
            if (collection[method]) {
                throw new InternalError(`Duplicate endpoint ${method} ${name}`);
            }

            collection[method] = meta;
            methods[method] ??= [];
            methods[method]?.push(meta);
        }
    }

    const match = (method: HttpMethod, path: string) => {
        const collection = methods[method];
        if (!collection) {
            return null;
        }

        for (const endpoint of collection) {
            const match = endpoint.match(path);
            if (match) {
                return { ...endpoint, params: match.params as Record<string, string> };
            }
        }

        return null;
    };

    return { match, endpoints, methods };
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
            const httpMethodParseResult = HttpMethodSchema.safeParse(methodOrPath.toUpperCase());
            if (!httpMethodParseResult.success) {
                throw new InternalError(`Invalid HTTP method: ${methodOrPath} for ${name}`, {
                    cause: httpMethodParseResult.error,
                });
            }

            return {
                name: maybePath,
                method: httpMethodParseResult.data,
                config: value.config,
                Executor: value.Executor,
            };
        }

        return {
            name: methodOrPath,
            method: 'GET' as const,
            config: value.config,
            Executor: value.Executor,
        };
    }

    if (path.startsWith('/')) {
        throw new InternalError(`RPC endpoint "${path}" should not start with a leading slash`);
    }

    return {
        name: `/${path}`,
        method: 'POST' as const,
        config: value.config,
        Executor: value.Executor,
    };
};
