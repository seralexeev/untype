import PlusOutlined from '@ant-design/icons/PlusOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import * as ant from 'antd';
import { FC, useState } from 'react';
import { useRpc } from '../rpc/useRpc';
import { ui } from '../ui';
import { useDrawer } from '../ui/components/Drawer';
import { TodoForm } from './TodoForm';

export const TodoList: FC = () => {
    const [pageSize, setPageSize] = useState(50);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const showDrawer = useDrawer();

    const { data, refetch, isLoading } = useRpc('todo/find').useQuery({
        input: { page, pageSize, search },
    });

    return (
        <ant.Table
            bordered
            size='small'
            pagination={{
                current: page,
                total: data?.total ?? 0,
                pageSize,
                onChange: setPage,
                defaultPageSize: pageSize,
                showSizeChanger: true,
                onShowSizeChange: (current: number, size: number) => {
                    setPageSize(size);
                    setPage(current);
                },
            }}
            loading={isLoading}
            dataSource={data?.items ?? []}
            columns={[
                {
                    title: 'Text',
                    render: (_, x) => (
                        <ui.Box
                            children={x.text}
                            onClick={() => {
                                return showDrawer({
                                    title: 'Add Todo',
                                    content: ({ onClose }) => <TodoForm item={x} onSuccess={onClose} />,
                                });
                            }}
                        />
                    ),
                },
                { title: 'User', render: (_, x) => x.user.firstName },
                { title: 'Status', render: (_, x) => x.status },
                { title: 'Created At', render: (_, x) => new Date(x.createdAt).toLocaleDateString() },
                { title: 'Updated At', render: (_, x) => new Date(x.updatedAt).toLocaleDateString() },
            ]}
            title={() => (
                <ui.Box display='flex' gap={8}>
                    <ant.Button
                        children='Add'
                        type='primary'
                        icon={<PlusOutlined />}
                        onClick={() => {
                            return showDrawer({
                                title: 'Add Todo',
                                content: ({ onClose }) => <TodoForm onSuccess={onClose} />,
                            });
                        }}
                    />
                    <ant.Input placeholder='Search...' value={search} onChange={(e) => setSearch(e.target.value)} />
                    <ui.Box marginLeft={8}>
                        <ant.Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                    </ui.Box>
                </ui.Box>
            )}
            footer={() => <ant.Typography.Text type='secondary' children={`Total count: ${data?.total ?? 0}`} />}
        />
    );
};
