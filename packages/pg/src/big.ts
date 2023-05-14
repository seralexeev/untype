import Big from 'big.js';
import { types } from 'pg';

Big.prototype.toPostgres = function () {
    return this.toFixed(2);
};

types.setTypeParser(1700, (val) => new Big(val));
