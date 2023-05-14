import { define } from './default';

export const local = define({
    server: {
        includeErrorsResponse: true,
    },
    logger: {
        level: 'debug',
        pretty: 'yaml',
    },
});
