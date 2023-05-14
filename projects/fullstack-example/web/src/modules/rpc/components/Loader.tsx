import { RpcEndpoint, RpcInput, RpcOutput } from '@fullstack-example/api';
import { UseQueryResult } from '@tanstack/react-query';
import { Fragment, ReactNode } from 'react';
import { useRpc } from '../../rpc/useRpc';
import { ui } from '../../ui';

type LoaderProps<TEndpoint extends RpcEndpoint> = {
    endpoint: TEndpoint;
    children: (data: RpcOutput<TEndpoint>, query: UseQueryResult<RpcOutput<TEndpoint>>) => ReactNode;
    cacheTime?: number;
} & (undefined extends RpcInput<TEndpoint> ? { input?: RpcInput<TEndpoint> } : { input: RpcInput<TEndpoint> });

export const Loader = <TEndpoint extends RpcEndpoint>({ children, endpoint, input, cacheTime }: LoaderProps<TEndpoint>) => {
    const query = useRpc(endpoint).useQuery({ input: input as any, cacheTime });

    if (!query.isSuccess) {
        return <ui.FetchFallback query={query} />;
    }

    return <Fragment children={children(query.data as any, query as any)} />;
};
