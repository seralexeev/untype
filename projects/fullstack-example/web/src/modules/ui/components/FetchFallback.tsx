import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import {
    QueryObserverLoadingErrorResult,
    QueryObserverLoadingResult,
    QueryObserverRefetchErrorResult,
} from '@tanstack/react-query';
import * as ant from 'antd';
import { Fragment, ReactNode } from 'react';
import Box from 'ui-box';

type FetchFallbackProps<TData> = {
    query: QueryObserverLoadingErrorResult<TData> | QueryObserverLoadingResult<TData> | QueryObserverRefetchErrorResult<TData>;
    children?: ReactNode;
};

export const FetchFallback = <T,>({ query, children }: FetchFallbackProps<T>) => {
    if (query.isLoading && query.isFetching) {
        return children ? (
            <Fragment children={children} />
        ) : (
            <Box display='flex' justifyContent='center' alignItems='center' height='100%' width='100%'>
                <ant.Spin />
            </Box>
        );
    }

    const error: any = query.error;
    const message = error.message ?? 'Error';
    const description = error?.response?.data?.message ?? error.message ?? 'Error';

    return (
        <Box
            display='flex'
            justifyContent='center'
            alignItems='center'
            flexDirection='column'
            gap={16}
            height='100%'
            width='100%'
        >
            <ant.Alert message={message} description={description} type='error' showIcon />
            <ant.Button onClick={() => query.refetch()} children='Retry' icon={<ReloadOutlined />} />
        </Box>
    );
};
