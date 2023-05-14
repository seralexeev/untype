import { FC } from 'react';
import { UserProvider } from './modules/auth/UserProvider';
import { ConfigProvider } from './modules/config/ConfigProvider';
import { AntdConfigProvider } from './modules/layout/AntdConfigProvider';
import { AppRouter } from './modules/navigation/AppRouter';
import { ApiProvider } from './modules/rpc/ApiProvider';
import { DrawerProvider } from './modules/ui/components/Drawer';

export const App: FC = () => {
    return (
        <AntdConfigProvider>
            <ApiProvider>
                <ConfigProvider>
                    <UserProvider>
                        <DrawerProvider>
                            <AppRouter />
                        </DrawerProvider>
                    </UserProvider>
                </ConfigProvider>
            </ApiProvider>
        </AntdConfigProvider>
    );
};
