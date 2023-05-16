import { createContext, FC, ReactNode, useContext } from 'react';

import { RpcOutput } from '@untype/fullstack-example-api';
import { useRpc } from '../rpc/useRpc';
import { ui } from '../ui';

type ContextType = {
    config: RpcOutput<'config/get'>;
    refetch: () => Promise<unknown>;
};

const Context = createContext<ContextType | null>(null);
export const useConfig = () => {
    const context = useContext(Context);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }

    return context;
};

export const ConfigProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const query = useRpc('config/get').useQuery();
    if (!query.isSuccess) {
        return <ui.FetchFallback query={query} />;
    }

    const value = {
        config: query.data,
        refetch: query.refetch,
    };

    return <Context.Provider value={value} children={children} />;
};
