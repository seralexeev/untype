import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import * as ant from 'antd';
import { FC, ReactNode } from 'react';
import { useProfile } from '../auth/UserProvider';
import { EnvironmentTag } from '../config/EnvironmentTag';
import { ui } from '../ui';

type LayoutProps = {
    children?: ReactNode;
};

export const Layout: FC<LayoutProps> = ({ children }) => {
    const { profile, logout } = useProfile();

    return (
        <ui.Box height='100vh' display='flex' flexDirection='column' overflow='hidden'>
            <ui.Box display='flex' height={64} background='#001529' flexShrink={0} paddingRight={16}>
                <ui.Box display='flex' alignItems='center' paddingX={16} gap={16}>
                    <EnvironmentTag />
                </ui.Box>
                <ui.Box display='flex' alignItems='center' flex={1} />

                <ui.Box display='flex' alignItems='center' cursor='pointer'>
                    <ant.Dropdown
                        placement='bottom'
                        arrow
                        trigger={['click']}
                        menu={{
                            items: [
                                { key: 'profile', label: profile.firstName, disabled: true },
                                { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: logout },
                            ],
                        }}
                    >
                        <ant.Avatar children={profile.firstName[0]?.toUpperCase()} size={32} />
                    </ant.Dropdown>
                </ui.Box>
            </ui.Box>
            <ant.Layout>
                <ui.Box flex={1} display='flex' height='100%' flexDirection='column' overflowX='hidden' background='#F4F7FC'>
                    <ui.Box padding={16} flex={1} overflow='auto' children={children} height='100%' />
                </ui.Box>
            </ant.Layout>
        </ui.Box>
    );
};
