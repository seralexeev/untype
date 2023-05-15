import { createConfig } from '@untype/config';

import { shape } from './env/default';
import { dev } from './env/dev';
import { local } from './env/local';
import { prod } from './env/prod';

export class Config extends createConfig({
    shape,
    prefix: 'UNTYPE_EXAMPLE__',
    source: process.env,
    environments: { prod, local, dev },
}) {}
