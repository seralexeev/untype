import {
    ConnectionField,
    Field,
    ForeignField,
    Query,
    QueryableField,
    QueryableListField,
    SimpleListField,
    SimpleSelectFields,
} from './types';

type MakeItStrict<T, S> = { [K in Remaining<T, S>]: never };
export type Remaining<T, P> = {
    [K in keyof P]: K extends keyof T ? never : K;
}[keyof P];

export type FieldSelector<T, S> = Array<keyof SimpleSelectFields<T>> | (ObjectLikeSelector<T, S> & MakeItStrict<T, S>);

type QueryableSelector<T, S, E = T> = Query<E> & {
    selector: FieldSelector<T, S extends { selector: infer Q } ? Q : never>;
};

// prettier-ignore
export type ObjectLikeSelector<T, S> = {
    [K in keyof T]?
        : T[K] extends Field                                                 ? true
        : T[K] extends ForeignField<infer U> | QueryableField<infer U>       ? FieldSelector<NonNullable<U>, S[K & keyof S]>
        : T[K] extends QueryableListField<infer U>                           ? QueryableSelector<U, S[K & keyof S]>
        : T[K] extends SimpleListField<infer U>                              ? FieldSelector<U, S[K & keyof S]>
        : T[K] extends ConnectionField<infer U>                              ? QueryableSelector<{ totalCount: Field<number>, nodes: SimpleListField<U> }, S[K & keyof S], U>
        : never;
};

export type ExtractSelect<T> = T extends Field<infer S> ? S : never;
export type ExtractInnerSelector<T> = T extends { selector: infer Q } ? Q : never;

// prettier-ignore
export type SelectorShape<T, S> = S extends any[]
    ? { [K in keyof Pick<T, S[number]>]: ExtractSelect<Pick<T, S[number]>[K]> } 
    : {
        [K in keyof S]
            : T[K & keyof T] extends Field<infer Q> ? Q
            : T[K & keyof T] extends ForeignField<infer Q> | QueryableField<infer Q>
                ? null extends Q
                    ? SelectorShape<NonNullable<Q>, S[K]> | null
                    : SelectorShape<NonNullable<Q>, S[K]> 
            : T[K & keyof T] extends QueryableListField<infer Q> ? Array<SelectorShape<Q, ExtractInnerSelector<S[K]>>>
            : T[K & keyof T] extends SimpleListField<infer Q>    ? Array<SelectorShape<Q, S[K]>>
            : T[K & keyof T] extends ConnectionField<infer Q>    ? SelectorShape<{ totalCount: Field<number>, nodes: SimpleListField<Q> }, ExtractInnerSelector<S[K]>>
            : never;
    };
