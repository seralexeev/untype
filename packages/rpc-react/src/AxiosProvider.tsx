import Axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createContext, FC, ReactNode, useContext, useMemo } from 'react';

type ContextType = {
    axios: AxiosInstance;
};

const Context = createContext<ContextType | null>(null);
export const useAxios = () => {
    const context = useContext(Context);
    if (!context) {
        throw new Error('useAxios must be used within an AxiosProvider');
    }

    return context;
};

export const AxiosProvider: FC<{ children: ReactNode; config?: AxiosRequestConfig }> = ({ children, config }) => {
    const value = useMemo(() => {
        const axios = Axios.create(config);

        axios.interceptors.response.use(handleBlob, async (error) => {
            if (Axios.isAxiosError(error) && error.response) {
                await handleBlob(error.response);
            }

            throw error;
        });

        return { axios };
    }, [config]);

    return <Context.Provider value={value} children={children} />;
};

export const isHttpError = (error: unknown, status?: number): error is AxiosError => {
    if (!error) {
        return false;
    }

    if (!Axios.isAxiosError(error)) {
        return false;
    }

    return !status || error.response?.status === status;
};

const handleBlob = async (response: AxiosResponse) => {
    const contentDisposition = response.headers?.['content-disposition'];
    if (contentDisposition) {
        const filename = /filename="(?<filename>.*)"/.exec(contentDisposition)?.groups?.filename ?? 'Unnamed file';
        response.data = { filename, data: response.data };
    } else if (response.data instanceof Blob && response.data.type === 'application/json') {
        const text = await response.data.text();
        response.data = JSON.parse(text);
    }

    return response;
};
