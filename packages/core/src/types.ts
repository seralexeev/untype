export type FilterKeys<T, F> = {
    [K in keyof T]: T[K] extends F ? K : never;
}[keyof T];

type PickType<T, K extends AllKeys<T>> = T extends { [k in K]?: any } ? T[K] : never;
export type AllKeys<T> = T extends any ? keyof T : never;
export type Merge<T extends object> = {
    [k in AllKeys<T>]: PickType<T, k>;
};

export type OmitNever<T> = {
    [K in keyof T as T[K] extends never ? never : K]: T[K];
};

export type ArrayElement<T> = T extends Array<infer U> ? U : never;

export type Overwrite<T, U> = Omit<T, keyof U> & U;

export type Class<T, Arguments extends unknown[] = any[]> = Constructor<T, Arguments> & { prototype: T };
export type Constructor<T, Arguments extends unknown[] = any[]> = new (...arguments_: Arguments) => T;

export type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined };
export type JsonArray = JsonValue[] | readonly JsonValue[];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type SimplifyDeep<T> = { [KeyType in keyof T]: SimplifyDeep<T[KeyType]> } & {};
