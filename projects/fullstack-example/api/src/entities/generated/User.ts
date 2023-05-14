/* eslint-disable */
/**
 * This file was automatically generated and should not be edited.
 * If you want to make changes to the entity use migrations instead.
 */

import { ApplyOverride, ConnectionField, EntityAccessor, Field, PrimaryKey, QueryableListField } from '@untype/orm';
import type { Todo } from '.';
import { OverrideMap } from '../override';

// prettier-ignore
export interface User extends ApplyOverride<{
    pk: PrimaryKey<{ id: string }>;

    id: Field<string, string | undefined>;

    email: Field<string, string>;
    firstName: Field<string, string>;
    lastName: Field<string, string>;

    createdAt: Field<Date, Date | undefined>;
    updatedAt: Field<Date, Date | undefined>;

    todosConnection: ConnectionField<Todo>;

    todos: QueryableListField<Todo>;
}, OverrideMap['User']> { }

export const Users = new EntityAccessor<User>('User');
