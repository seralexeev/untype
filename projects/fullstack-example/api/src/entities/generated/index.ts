/* eslint-disable */

import { EntityFieldsOverride, OverrideConstraint } from '@untype/orm';

export * from './Todo';
import { Todo } from './Todo';

export * from './User';
import { User } from './User';

export type EntityMap = {
    Todo: Todo;
    User: User;
};

export type FieldsOverride<T extends OverrideConstraint<EntityMap>> = EntityFieldsOverride<EntityMap, T>;
