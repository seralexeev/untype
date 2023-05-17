/* eslint-disable */
/**
 * This file was automatically generated and should not be edited.
 * If you want to make changes to the entity use migrations instead.
 */

import { ApplyOverride, EntityAccessor, Field, ForeignField, PrimaryKey } from '@untype/orm';
import type { User } from '.';
import { OverrideMap } from '../override';

// prettier-ignore
export interface Todo extends ApplyOverride<{
    pk: PrimaryKey<{ id: string }>;

    id: Field<string, string | undefined>;

    cover: Field<string | null, string | null | undefined>;
    status: Field<string, string>;
    tags: Field<string[], string[] | undefined>;
    text: Field<string, string>;
    userId: Field<string, string>;

    createdAt: Field<Date, Date | undefined>;
    updatedAt: Field<Date, Date | undefined>;

    user: ForeignField<User>;
}, OverrideMap['Todo']> { }

export const Todos = new EntityAccessor<Todo>('Todo');
