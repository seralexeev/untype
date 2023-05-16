import { OmitNever } from '@untype/core';

import { Filter } from './filter';

export type Field<TSelect = any, TCreate = any> = {
    type: 'simple';
    select: TSelect;
    create: TCreate;
};

export type ForeignField<TSelect = any> = {
    type: 'foreign';
    select: TSelect;
};

export type QueryableField<TSelect = any, TCreate = any> = {
    type: 'queryable';
    select: TSelect;
    create: TCreate;
};

export type ConnectionField<TSelect = any> = {
    type: 'connection';
    select: { totalCount: Field<number>; nodes: SimpleListField<TSelect> };
};

export type SimpleListField<TSelect = any> = {
    type: 'simple-list';
    select: TSelect;
};

export type QueryableListField<TSelect = any> = {
    type: 'list';
    select: TSelect;
};

export type PrimaryKey<T> = {
    type: 'pk';
    select: T;
};

export type SimpleInsertFields<T> = OmitNever<{
    [K in keyof T]: T[K] extends Field<any, infer S> | QueryableField<any, infer S> ? S : never;
}>;

export type SimpleSelectFields<T> = OmitNever<{
    [K in keyof T]: T[K] extends Field<infer S, any> ? S : never;
}>;

export type UndefinedFields<T> = OmitNever<{
    [K in keyof T]: undefined extends T[K] ? T[K] : never;
}>;

export type NonUndefinedFields<T> = OmitNever<{
    [K in keyof T]: undefined extends T[K] ? never : T[K];
}>;

export type SelectField<T, TField extends keyof SimpleSelectFields<T>> = TField extends keyof T
    ? T[TField] extends { select: infer F }
        ? F
        : never
    : never;

export type InsertShape<T> = Partial<UndefinedFields<SimpleInsertFields<T>>> & NonUndefinedFields<SimpleInsertFields<T>>;
export type UpdateShape<T> = Partial<SimpleInsertFields<T>>;
export type EntityShape<T> = SimpleInsertFields<T>;

export type InferPrimaryKey<T> = object & { [K in keyof T]: T[K] extends PrimaryKey<infer P> ? P : never }[keyof T];

export type OrderBy<T> = Array<[keyof EntityShape<T> | RelatedOrderBy<T>, 'ASC' | 'DESC']>;

type RelatedOrderBy<T> = {
    [K in keyof T]: T[K] extends ForeignField<infer F> ? [K, keyof EntityShape<F>] : never;
}[keyof T];

export type Query<T> = {
    filter?: Filter<T>;
    first?: number;
    offset?: number;
    orderBy?: OrderBy<T>;
};

export type OverrideConstraint<T> = { [K in keyof T]?: Partial<Record<keyof T[K], unknown>> };
export type EntityFieldsOverride<T, U extends OverrideConstraint<T>> = U & Record<keyof T, {}>;

export type ApplyOverride<T, U> = {
    [K in keyof T]: K extends keyof U ? U[K] : T[K];
};
