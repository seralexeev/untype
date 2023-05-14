import GoogleOutlined from '@ant-design/icons/GoogleOutlined';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import * as ant from 'antd';
import { FC } from 'react';
import { useConfig } from '../config/ConfigProvider';
import { useRpc } from '../rpc/useRpc';
import { ui } from '../ui';
import { useProfile } from './UserProvider';

export const AuthPage: FC = () => {
    const { config } = useConfig();

    return (
        <GoogleOAuthProvider clientId={config.auth.google.clientId}>
            <AuthPageImpl />
        </GoogleOAuthProvider>
    );
};

const AuthPageImpl: FC = () => {
    const { refetch } = useProfile();
    const { mutateAsync, isLoading } = useRpc('auth/login').useMutation({
        onSuccess: refetch,
    });

    const login = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: mutateAsync,
    });

    return (
        <ui.Box height='100%' display='flex' justifyContent='center' alignItems='center'>
            <ant.Button onClick={login} icon={<GoogleOutlined />} children='Login' type='primary' loading={isLoading} />
        </ui.Box>
    );
};
