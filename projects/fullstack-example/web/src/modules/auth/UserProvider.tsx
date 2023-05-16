import { RpcOutput } from '@untype/fullstack-example-api';
import { isHttpError, useAxios } from '@untype/rpc-react';
import { FC, ReactNode, createContext, useContext, useEffect } from 'react';
import { useReset, useRpc } from '../rpc/useRpc';
import { ui } from '../ui';

type UserProfile = RpcOutput<'auth/profile'>;
type ContextType = {
    profile: RpcOutput<'auth/profile'>;
    refetch: () => Promise<unknown>;
    logout: () => Promise<unknown>;
};

const Context = createContext<ContextType | null>(null);
export const useProfile = () => {
    const context = useContext(Context);
    if (!context) {
        throw new Error('useProfile must be used within a UserProvider');
    }

    return context;
};

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { axios } = useAxios();
    const query = useRpc('auth/profile').useQuery();
    const resetQuery = useReset();
    const { mutateAsync: logout } = useRpc('auth/logout').useMutation();

    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(undefined, async (error) => {
            if (isHttpError(error, 401)) {
                if (query.data) {
                    await resetQuery(['auth/profile']);
                }
            }

            throw error;
        });

        return () => axios.interceptors.response.eject(interceptorId);
    }, [axios.interceptors.response, query, resetQuery]);

    if (!query.isSuccess && !isHttpError(query.error, 401)) {
        return <ui.FetchFallback query={query} />;
    }

    const value = {
        profile: query.data as UserProfile,
        refetch: query.refetch,
        logout: () => logout(null).then(() => query.remove()),
    };

    return <Context.Provider value={value} children={children} />;
};
