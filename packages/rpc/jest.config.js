const base = require('../../jest.config.base');
const packageJson = require('./package');

process.env.ENVIRONMENT = 'jest';

module.exports = {
    ...base,
    displayName: packageJson.name,
};
