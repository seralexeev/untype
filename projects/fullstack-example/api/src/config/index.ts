import { EnvLoader, FileLoader, createConfig } from '@untype/config';
import { shape } from './env/default';
import { dev } from './env/dev';
import { local } from './env/local';
import { prod } from './env/prod';

const prefix = 'UNTYPE_EXAMPLE__';

export class Config extends createConfig({
    shape,
    loaders: [
        new FileLoader({
            env: process.env[`${prefix}env`],
            environments: { dev, local, prod },
        }),
        new EnvLoader({
            prefix,
            source: process.env,
        }),
    ],
}) {}
