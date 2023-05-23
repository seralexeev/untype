import { EnvLoader, FileLoader, createConfig } from '@untype/config';
import { shape } from './default';
import { dev } from './env/dev';
import { local } from './env/local';
import { prod } from './env/prod';

export class Config extends createConfig(shape, [
    new FileLoader(process.env.UNTYPE_EXAMPLE__env, { dev, local, prod }),
    new EnvLoader('UNTYPE_EXAMPLE__env', process.env),
]) {}
