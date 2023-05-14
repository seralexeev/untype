import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';

import { createConfig } from '../loader';
import { ConfigShape } from '../shape';

/**
 * @group unit
 */
describe('Config Loader', () => {
    it('loads config from env', async () => {
        const { shape, define } = new ConfigShape({
            name: z.string().default('name'),
            enabled: z.boolean().default(true),
            nested: {
                value: z.number().default(1000),
            },
        });

        const dev = define({});
        const prod = define({
            name: 'prod-name',
            nested: {
                value: 2000,
            },
        });

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: {
                CFG__env: 'prod',
                CFG__name: 'env-name',
                CFG__nested_value: '3000',
            },
            environments: { dev, prod },
        }) {}

        const config = await Config.load();

        expect(config).toEqual({
            env: 'prod',
            name: 'env-name',
            enabled: true,
            nested: {
                value: 3000,
            },
            version: '0.0.0',
        });
    });

    it('loads config from defined env', async () => {
        const { define, shape } = new ConfigShape({
            name: z.string().default('name'),
            enabled: z.boolean().default(true),
            nested: {
                value: z.string().default('value'),
            },
        });

        const dev = define({});
        const prod = define({
            name: 'prod-name',
            nested: {
                value: 'prod-value',
            },
        });

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: { CFG__env: 'prod' },
            environments: { dev, prod },
        }) {}

        const config = await Config.load();

        expect(config).toEqual({
            env: 'prod',
            name: 'prod-name',
            enabled: true,
            nested: {
                value: 'prod-value',
            },
            version: '0.0.0',
        });
    });

    it('loads config with default values', async () => {
        const { define, shape } = new ConfigShape({
            name: z.string().default('name'),
            enabled: z.boolean().default(true),
            nested: {
                value: z.string().default('value'),
            },
        });

        const dev = define({});

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: { CFG__env: 'dev' },
            environments: { dev },
        }) {}

        const config = await Config.load();

        expect(config).toEqual({
            env: 'dev',
            name: 'name',
            enabled: true,
            nested: {
                value: 'value',
            },
            version: '0.0.0',
        });
    });

    it('fails if env is not loaded', async () => {
        const { shape } = new ConfigShape({
            name: z.string().default('name'),
            enabled: z.boolean().default(true),
        });

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: { CFG__env: 'dev' },
            environments: {},
        }) {}

        await expect(() => Config.load()).rejects.toThrow();
    });

    it('fails if config contains env field', () => {
        expect(() => {
            return new ConfigShape({
                env: z.number(),
                name: z.string().default('name'),
                enabled: z.boolean().default(true),
            });
        }).toThrow();
    });

    it('fails if env is not defined', async () => {
        const { define, shape } = new ConfigShape({
            name: z.string().default('name'),
            enabled: z.boolean().default(true),
        });

        const dev = define({});

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: {},
            environments: { dev },
        }) {}

        await expect(() => Config.load()).rejects.toThrow();
    });

    it('fails if bad boolean', async () => {
        const { define, shape } = new ConfigShape({
            enabled: z.boolean().default(true),
        });

        const dev = define({});

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: { CFG__env: 'dev', CFG__enabled: 'x' },
            environments: { dev },
        }) {}

        await expect(() => Config.load()).rejects.toThrow();
    });

    it('fails if bad number', async () => {
        const { define, shape } = new ConfigShape({
            value: z.number().default(1),
        });

        const dev = define({});

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: { CFG__env: 'dev', CFG__value: 'x' },
            environments: { dev },
        }) {}

        await expect(() => Config.load()).rejects.toThrow();
    });

    it('fails if no required value', async () => {
        const { define, shape } = new ConfigShape({
            name: z.string(),
        });

        const dev = define({});

        class Config extends createConfig({
            shape,
            prefix: 'CFG__',
            source: { CFG__env: 'dev' },
            environments: { dev },
        }) {}

        await expect(() => Config.load()).rejects.toThrow();
    });
});
