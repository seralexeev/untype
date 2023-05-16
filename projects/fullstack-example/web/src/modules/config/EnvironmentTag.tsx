import * as ant from 'antd';
import { FC } from 'react';

import { RpcOutput } from '@untype/fullstack-example-api';
import { useConfig } from './ConfigProvider';

export const EnvironmentTag: FC = () => {
    const { config } = useConfig();

    return (
        <ant.Tooltip placement='bottom'>
            <ant.Tag color={getColor(config.env)} children={config.env} />
        </ant.Tooltip>
    );
};

const getColor = (env: RpcOutput<'config/get'>['env']): ant.TagProps['color'] => {
    switch (env) {
        case 'prod':
            return '#f50';
        case 'dev':
            return '#2db7f5';
        case 'local':
            return '#87d068';
        default:
            return 'gray';
    }
};
