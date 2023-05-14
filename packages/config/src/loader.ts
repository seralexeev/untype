import { flatten, unflatten } from 'flat';
import { ZodError, ZodErrorMap, ZodIssueCode, z } from 'zod';
import { BaseConfig, ConfigBase, ConfigOverride, InferConfig } from './types';
import { getStringPreprocessor } from './zod';

type LoaderOptions<TConfig extends BaseConfig<TConfig>, TEnv extends Record<string, ConfigOverride<TConfig>>> = {
    environments: TEnv;
    shape: TConfig;
    prefix: string;
    source: Record<string, string | undefined>;
    ignoreErrors?: boolean;
};

export const createConfig = <TConfig extends BaseConfig<TConfig>, TEnv extends Record<string, ConfigOverride<TConfig>>>(
    options: LoaderOptions<TConfig, TEnv>,
) => {
    const loader = new ConfigLoader<TConfig, TEnv>(options);

    return class extends ConfigBase<Awaited<ReturnType<typeof loader.load>>> {
        public static load = loader.load;
        public static options = options;
    };
};

class ConfigLoader<TConfig extends BaseConfig<TConfig>, TEnv extends Record<string, ConfigOverride<TConfig>>> {
    public constructor(public options: LoaderOptions<TConfig, TEnv>) {}

    public load = async () => {
        const { shape, source, prefix, ignoreErrors = false, environments } = this.options;

        const envArray = Object.keys(environments);
        z.array(z.string().min(1)).parse(envArray);

        const errors: Array<[string, ZodError]> = [];

        const env = source.ENVIRONMENT || source[`${prefix}env`];
        if (!env || !(env in environments)) {
            throw new Error(`${prefix}env or ENVIRONMENT should be one of [${envArray.join(', ')}], got "${String(env)}"`);
        }
        const version = source.VERSION || '0.0.0';

        const definedConfig: Record<string, unknown> = flatten(environments[env], { delimiter: '_' });
        const flattenConfig = flattenSchema(shape, '_');

        const parsedConfig = Object.entries(flattenConfig).reduce((acc, [key, schema]) => {
            // env - first priority
            let value = source[prefix + key];

            // config file - third priority
            if (value === undefined) {
                value = definedConfig[key] as string | undefined;
            }

            const parsedValue = schema.safeParse(value, { errorMap: this.errorMap });
            if (parsedValue.success) {
                acc[key] = parsedValue.data;
            } else {
                errors.push([key, parsedValue.error]);
            }

            return acc;
        }, {} as Record<string, unknown>);

        if (errors.length > 0 && !ignoreErrors) {
            let multilineMessage = errors
                .flatMap(([key, error]) => {
                    return [`  - ${key}:`, ...error.issues.map((i) => `    * ${i.message}`)];
                })
                .join('\n');

            multilineMessage += '\n\n';
            multilineMessage += 'Copy into your environment variables:\n\n';
            multilineMessage += errors
                .flatMap(([key]) => {
                    return `export ${prefix}${key}=""`;
                })
                .join('\n');
            throw new Error(`Config issues:\n${multilineMessage}`);
        }

        parsedConfig.env = env;
        parsedConfig.version = version;

        const config = unflatten(parsedConfig, { delimiter: '_' }) as InferConfig<TConfig> & {
            env: keyof TEnv;
            version: string;
        };

        return config;
    };

    private errorMap: ZodErrorMap = (issue, ctx) => {
        if (issue.code === ZodIssueCode.invalid_type && issue.received === 'undefined') {
            return { message: 'This configuration field is required.' };
        }

        return { message: ctx.defaultError };
    };
}

export const flattenSchema = (
    config: Record<string, unknown>,
    separator: string,
    path: string = '',
    items: Record<string, z.ZodType> = {},
) => {
    for (const [key, value] of Object.entries(config)) {
        const fullPath = path ? path + separator + key : key;

        if (value instanceof z.ZodType) {
            items[fullPath] = z.preprocess(getStringPreprocessor(value) as (arg: unknown) => unknown, value);
        } else {
            flattenSchema(value as Record<string, unknown>, separator, fullPath, items);
        }
    }

    return items;
};
