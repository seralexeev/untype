import { PartialDeep } from 'type-fest';
import { z } from 'zod';

export type InferConfig<T> = {
    [K in keyof T]: T[K] extends z.ZodTypeAny ? z.infer<T[K]> : InferConfig<T[K]>;
};

export type BaseConfig<T> = {
    [K in keyof T]: z.ZodType | (BaseConfig<T[K]> & Record<string, unknown>);
};

export type ConfigOverride<TConfig> = PartialDeep<InferConfig<TConfig>>;

export class ConfigBase<TConfig> {
    public constructor(public readonly config: TConfig) {}
}
