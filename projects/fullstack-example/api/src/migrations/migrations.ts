/* prettier-ignore */
/**
 * This file was auto-generated please do not modify it!
 */

import { MigrationList } from '@untype/migrations';

import init_1 from './001_init';
import addUsers_2 from './002_addUsers';
import addTodo_3 from './003_addTodo';
import addCover_4 from './004_addCover';

export const migrations: MigrationList = [
    { id: 1, name: 'init', apply: init_1 },
    { id: 2, name: 'addUsers', apply: addUsers_2 },
    { id: 3, name: 'addTodo', apply: addTodo_3 },
    { id: 4, name: 'addCover', apply: addCover_4 },
];
