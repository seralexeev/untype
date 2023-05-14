import { PartialDeep } from 'type-fest';

import { BaseConfig, InferConfig } from './types';

export class ConfigShape<TConfig extends BaseConfig<TConfig>> {
    public constructor(public readonly shape: TConfig) {
        if ('env' in shape) {
            throw new Error(`"env" is a reserved key. Do not use it in the config on the root level.`);
        }
    }

    public define = (config: PartialDeep<InferConfig<TConfig>>) => config;
}
