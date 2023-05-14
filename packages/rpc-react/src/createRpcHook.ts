import {
    UseMutationOptions,
    UseMutationResult,
    UseQueryOptions,
    UseQueryResult,
    useMutation as useMutationLib,
    useQueryClient,
    useQuery as useQueryLib,
} from '@tanstack/react-query';
import { AxiosInstance, AxiosRequestConfig } from 'axios';

import { useAxios } from './AxiosProvider';

export const createRpcHook = <T extends Record<string, { input?: any; output?: any }>>({ path }: { path: string }) => {
    const useRpc = <M extends keyof T>(method: M, axiosInstance?: AxiosInstance) => {
        type TInput = T[M]['input'];
        type TOutput = T[M]['output'];
        type QueryOptions = Omit<UseQueryOptions<TOutput, unknown, TOutput>, 'queryKey' | 'queryFn'>;
        type MutationOptions = Omit<UseMutationOptions<TOutput, unknown, TOutput>, 'mutationKey' | 'mutationFn'> & {
            invalidates?: Array<keyof T>;
        };

        type QueryResult = UseQueryResult<TOutput>;

        type MutationResult = UseMutationResult<TOutput, unknown, T[M] extends { input: any } ? TInput : null>;

        type UseQuery = T[M] extends { input: any }
            ? (options: QueryOptions & { input: TInput }) => QueryResult
            : (options?: QueryOptions) => QueryResult;

        type UseMutation = (options?: MutationOptions) => MutationResult;

        const queryClient = useQueryClient();

        function invalidate(): Promise<void>;
        function invalidate(input?: TInput): Promise<void> {
            return queryClient.invalidateQueries(input ? [method, input] : [method]);
        }

        const { axios: contextAxios } = useAxios();
        const axios = axiosInstance ?? contextAxios;

        const useQuery: UseQuery = ({ input, ...options }: any = {}) => {
            const hook: any = useQueryLib(
                [method, input],
                async ({ signal }) => {
                    const res = await axios.post<TOutput>(`${path}/${String(method)}`, input, { signal });
                    return res.data;
                },
                options,
            );

            return hook;
        };

        const useMutation: UseMutation = ({ invalidates, ...options }: any = {}) => {
            return useMutationLib(
                [method],
                async (input: any) => {
                    const config: AxiosRequestConfig = {
                        url: `${path}/${String(method)}`,
                        method: 'post',
                        responseType: 'blob',
                    };

                    if (input instanceof File) {
                        const formData = new FormData();
                        formData.append('file', input);

                        config.headers = { 'Content-Type': 'multipart/form-data' };
                        config.data = formData;
                    } else {
                        config.data = input;
                    }

                    return axios(config).then(async (res) => {
                        if (invalidates) {
                            await Promise.all(invalidates.map((x: string) => queryClient.invalidateQueries([x])));
                        }

                        return res.data;
                    });
                },
                options,
            );
        };

        return {
            useQuery,
            useMutation,
            invalidate,
            useRequest: () => {
                return (input: TInput) => {
                    return axios.post<TOutput>(path, { method, input }).then((res) => res.data);
                };
            },
        };
    };

    const useInvalidate = () => {
        const queryClient = useQueryClient();

        return (queries: Array<keyof T>) => Promise.all(queries.map((x) => queryClient.invalidateQueries([x])));
    };

    const useReset = () => {
        const queryClient = useQueryClient();

        return (queries: Array<keyof T>) => Promise.all(queries.map((x) => queryClient.resetQueries([x])));
    };

    return { useRpc, useInvalidate, useReset };
};
