import { makeWorkerUtils } from 'graphile-worker';

import { Pg } from '@untype/pg';

export const createWorkerUtils = (pg: Pg) => {
    return makeWorkerUtils({ pgPool: pg.master.pool });
};
