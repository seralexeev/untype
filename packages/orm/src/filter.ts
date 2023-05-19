import { JsonArray, JsonValue } from 'type-fest';

import { Field, ForeignField, QueryableListField } from './types';

// prettier-ignore
export type Filter<T> =
    | {
          [P in keyof T]?
              : T[P] extends ForeignField<infer Q>       ? Filter<Q>
              : T[P] extends QueryableListField<infer Q> ? QueryableListFilter<Q>
              : T[P] extends Field<infer Q>
                  ? [Q] extends [string | null]    ? Scalar<Q>   | StringFilter
                  : [Q] extends [JsonValue | null] ? JsonFilter  | Scalar<Q>
                  : [Q] extends [Array<infer A>]   ? Scalar<T[]> | ArrayFilter<A>
                  : Scalar<Q>
              : never;
      }
    | { or: Array<Filter<T>> }
    | { and: Array<Filter<T>> }
    | { not: Filter<T> };

export type Scalar<T> =
    | { isNull: boolean }
    | { equalTo: T }
    | { notEqualTo: T }
    | { distinctFrom: T }
    | { notDistinctFrom: T }
    | { in: T[] }
    | { notIn: T[] }
    | { lessThan: T }
    | { lessThanOrEqualTo: T }
    | { greaterThan: T }
    | { greaterThanOrEqualTo: T };

export type StringFilter =
    | { includes: string }
    | { notIncludes: string }
    | { includesInsensitive: string }
    | { notIncludesInsensitive: string }
    | { startsWith: string }
    | { notStartsWith: string }
    | { startsWithInsensitive: string }
    | { notStartsWithInsensitive: string }
    | { endsWith: string }
    | { notEndsWith: string }
    | { endsWithInsensitive: string }
    | { notEndsWithInsensitive: string }
    | { like: string }
    | { notLike: string }
    | { likeInsensitive: string }
    | { notLikeInsensitive: string }
    | { equalToInsensitive: string }
    | { notEqualToInsensitive: string }
    | { distinctFromInsensitive: string }
    | { notDistinctFromInsensitive: string }
    | { inInsensitive: string[] }
    | { notInInsensitive: string[] }
    | { lessThanInsensitive: string }
    | { lessThanOrEqualToInsensitive: string }
    | { greaterThanInsensitive: string }
    | { greaterThanOrEqualToInsensitive: string };

export type ArrayFilter<T> =
    | { contains: T[] }
    | { containedBy: T[] }
    | { overlaps: T[] }
    | { anyEqualTo: T }
    | { anyNotEqualTo: T }
    | { anyLessThan: T }
    | { anyLessThanOrEqualTo: T }
    | { anyGreaterThan: T }
    | { anyGreaterThanOrEqualTo: T };

// prettier-ignore
export type QueryableListFilter<T> = 
    | { some: Filter<T> } 
    | { none: Filter<T> } 
    | { every: Filter<T> };

export type JsonFilter =
    | { isNull: boolean }
    | { equalTo: JsonValue }
    | { notEqualTo: JsonValue }
    | { distinctFrom: JsonValue }
    | { notDistinctFrom: JsonValue }
    | { in: JsonArray }
    | { notIn: JsonArray }
    | { lessThan: JsonValue }
    | { lessThanOrEqualTo: JsonValue }
    | { greaterThan: JsonValue }
    | { greaterThanOrEqualTo: JsonValue }
    | { contains: JsonValue }
    | { containsKey: string }
    | { containsAllKeys: string[] }
    | { containsAnyKeys: string[] }
    | { containedBy: JsonValue };
