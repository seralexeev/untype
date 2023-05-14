import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import MenuFoldOutlined from '@ant-design/icons/MenuFoldOutlined';
import MenuUnfoldOutlined from '@ant-design/icons/MenuUnfoldOutlined';
import * as ant from 'antd';
import { FC, ReactNode, useState } from 'react';
import { useProfile } from '../auth/UserProvider';
import { EnvironmentTag } from '../config/EnvironmentTag';
import { ui } from '../ui';

type LayoutProps = {
    children?: ReactNode;
};

export const Layout: FC<LayoutProps> = ({ children }) => {
    const { profile, logout } = useProfile();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <ui.Box height='100vh' display='flex' flexDirection='column' overflow='hidden'>
            <ui.Box display='flex' height={64} background='#001529' flexShrink={0} paddingRight={16}>
                <ui.Box display='flex' alignItems='center' paddingX={16}>
                    <ui.Box marginLeft={24}>
                        🚀 untype
                        <EnvironmentTag />
                    </ui.Box>
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
                <ant.Layout.Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={(value) => setCollapsed(value)}
                    collapsedWidth={0}
                    breakpoint='md'
                    trigger={null}
                >
                    Main Menu
                </ant.Layout.Sider>

                <ui.Box flex={1} display='flex' height='100%' flexDirection='column' overflowX='hidden' background='#F4F7FC'>
                    <ui.Box paddingTop={16} paddingLeft={16} paddingRight={16} display='flex' alignItems='center' gap={8}>
                        <ant.Button
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ flexShrink: 0 }}
                        />
                    </ui.Box>
                    <ui.Box padding={16} flex={1} overflow='auto' children={children} height='100%' />
                </ui.Box>
            </ant.Layout>
        </ui.Box>
    );
};
