import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AxiosProvider, isHttpError, useAxios } from '@untype/rpc-react';
import * as ant from 'antd';
import Axios, { AxiosResponse } from 'axios';
import { FC, ReactNode, useEffect, useRef } from 'react';

const queryClient = new QueryClient({
    defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false, refetchOnWindowFocus: false },
    },
});

export const ApiProvider: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <AxiosProvider>
                <AxiosInterceptor />
                {children}
            </AxiosProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
};

export const AxiosInterceptor: FC = () => {
    const { axios } = useAxios();
    const version = useRef<string>();

    useEffect(() => {
        const setVersion = (response: AxiosResponse) => {
            const serverVersion = response.headers['x-rpc-version'];
            if (serverVersion) {
                version.current = serverVersion;
            }

            return response;
        };

        const versionInterceptorId = axios.interceptors.request.use((config) => {
            if (version.current) {
                config.headers['x-rpc-version'] = version.current;
            }

            return config;
        });

        const errorInterceptorId = axios.interceptors.response.use(setVersion, (error) => {
            if (!isHttpError(error, 401) && !Axios.isCancel(error)) {
                const message = error.message ?? 'Error';
                const description = error?.response?.data?.message ?? error.message ?? 'Error';

                ant.notification.error({
                    placement: 'bottomRight',
                    message,
                    description,
                });

                if (isHttpError(error) && error.response) {
                    setVersion(error.response);
                }
            }

            throw error;
        });

        return () => {
            axios.interceptors.request.eject(versionInterceptorId);
            axios.interceptors.response.eject(errorInterceptorId);
        };
    }, []);

    return null;
};
