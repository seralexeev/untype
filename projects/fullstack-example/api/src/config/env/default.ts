import { ConfigShape } from '@untype/config';
import z from 'zod';

export const { shape, define } = new ConfigShape({
    server: {
        port: z.number().default(3000),
        includeErrorsResponse: z.boolean().default(false),
    },
    logger: {
        pretty: z.enum(['none', 'json', 'yaml']).default('none'),
        level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    },
    auth: {
        google: {
            clientId: z.string(),
            clientSecret: z.string(),
        },
    },
    pg: {
        user: z.string().default('untype'),
        password: z.string().default('untype'),
        database: z.string().default('untype'),
        host: z.string().default('localhost'),
        port: z.number().default(5434),
    },
});
