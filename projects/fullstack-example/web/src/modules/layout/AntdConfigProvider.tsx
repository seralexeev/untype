import * as ant from 'antd';
import { FC, ReactNode } from 'react';

type AntdConfigProviderProps = {
    children: ReactNode;
};

export const AntdConfigProvider: FC<AntdConfigProviderProps> = ({ children }) => {
    return (
        <ant.ConfigProvider
            theme={{
                algorithm: ant.theme.compactAlgorithm,
            }}
            children={children}
        />
    );
};
