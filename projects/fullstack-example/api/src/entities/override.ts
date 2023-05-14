import { Field } from '@untype/orm';
import { TodoStatus } from '../modules/todo/models';
import { FieldsOverride } from './generated';

export type OverrideMap = FieldsOverride<{
    Todo: {
        status: Field<TodoStatus, TodoStatus>;
    };
}>;
