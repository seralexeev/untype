import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import { createConfig } from './config';
import { EnvLoader, FileLoader } from './loader';
import { ConfigShape } from './shape';

describe('Config Loader', () => {
    it('loads from file', async () => {
        const { shape, define } = new ConfigShape({
            a: z.string().default('a'),
            b: z.boolean().default(true),
            c: {
                d: z.number().default(1000),
            },
        });

        class Config extends createConfig(shape, [new FileLoader('dev', { dev: define({ a: 'dev-a' }) })]) {}
        const config = await Config.load();

        expect(config).toEqual({
            a: 'dev-a',
            b: true,
            c: { d: 1000 },
        });
    });

    it('loads from env', async () => {
        const { shape } = new ConfigShape({
            a: z.string().default('a'),
            b: z.boolean().default(true),
            c: {
                d: z.number().default(1000),
            },
        });

        class Config extends createConfig(shape, [new EnvLoader('CFG__', { CFG__a: 'a-env' })]) {}

        const config = await Config.load();

        expect(config).toEqual({
            a: 'a-env',
            b: true,
            c: { d: 1000 },
        });
    });

    it('loads overrides config', async () => {
        const { shape, define } = new ConfigShape({
            a: z.string().default('a'),
            b: z.boolean().default(true),
            c: {
                d: z.number().default(1000),
            },
        });

        class Config extends createConfig(shape, [
            new FileLoader('dev', { dev: define({ a: 'dev-a' }) }),
            new EnvLoader('CFG__', { CFG__a: 'a-env' }),
        ]) {}

        const config = await Config.load();

        expect(config).toEqual({
            a: 'a-env',
            b: true,
            c: { d: 1000 },
        });
    });

    it('throws if required value is not provided', async () => {
        const { shape } = new ConfigShape({
            a: z.string().default('a'),
            b: z.boolean(),
            c: {
                d: z.number().default(1000),
            },
        });

        class Config extends createConfig(shape) {}

        await expect(Config.load()).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unable to parse config value for 'b'. Received value 'undefined'"`,
        );
    });
});
