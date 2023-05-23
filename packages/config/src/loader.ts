import { flatten } from 'flat';

export abstract class ConfigLoader {
    public abstract load(): Promise<Record<string, unknown>>;
}

export class EnvLoader extends ConfigLoader {
    public constructor(private options: { prefix: string; source: Record<string, string | undefined> }) {
        super();
    }

    public override load = () => {
        const { prefix, source } = this.options;
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(source)) {
            if (!key.startsWith(prefix)) {
                continue;
            }

            const path = key.slice(prefix.length).split('_').join(':');

            result[path] = value;
        }

        return Promise.resolve(result);
    };
}

export class FileLoader extends ConfigLoader {
    public constructor(private options: { env: string | undefined; environments: Record<string, unknown> }) {
        super();
    }

    public override load = async () => {
        const { env, environments } = this.options;

        if (!env) {
            throw new Error(`Environment not provided.`);
        }

        const config = environments[env];
        if (!config) {
            throw new Error(`Environment '${env}' not found.`);
        }

        return flatten(config, { delimiter: ':' }) as Record<string, unknown>;
    };
}
