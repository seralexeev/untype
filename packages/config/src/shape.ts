import { PartialDeep } from 'type-fest';
import { BaseConfig, InferConfig } from './types';

export class ConfigShape<TConfig extends BaseConfig<TConfig>> {
    public constructor(public readonly shape: TConfig) {}

    public define = (config: PartialDeep<InferConfig<TConfig>>) => config;
}
