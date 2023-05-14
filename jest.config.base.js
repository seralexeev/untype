process.env.TZ = 'UTC';
process.env.ENVIRONMENT = 'jest';

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: false,
    watchman: false,
    testPathIgnorePatterns: ['<rootDir>/dist/'],
};
