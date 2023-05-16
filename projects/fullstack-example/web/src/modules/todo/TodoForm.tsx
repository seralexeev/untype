import { RpcOutput, todoStatuses } from '@untype/fullstack-example-api';
import * as ant from 'antd';
import { FC } from 'react';
import { useRpc } from '../rpc/useRpc';

type EditModel = RpcOutput<'todo/getById'>;

type FormProps = {
    item?: EditModel;
    onSuccess?: () => void;
};

export const TodoForm: FC<FormProps> = ({ item, onSuccess }) => {
    const { mutateAsync, isLoading } = useRpc('todo/upsert').useMutation({
        invalidates: ['todo/find', 'todo/getById'],
        onSuccess,
    });

    const onFinish = (args: EditModel) => {
        return mutateAsync({ ...args, id: item?.id });
    };

    return (
        <ant.Form
            layout='vertical'
            initialValues={item ?? { text: '', tags: [] }}
            onFinish={onFinish}
            autoComplete='off'
            disabled={isLoading}
        >
            <ant.Form.Item label='Text' name='text' rules={[{ required: true, message: 'Text is required' }]}>
                <ant.Input width='100%' placeholder='Text' />
            </ant.Form.Item>

            <ant.Form.Item label='Tags' name='tags'>
                <ant.Select mode='tags' style={{ width: '100%' }} placeholder='Tags' />
            </ant.Form.Item>

            <ant.Form.Item label='Status' name='status' rules={[{ required: true, message: 'Status is required' }]}>
                <ant.Select
                    style={{ width: '100%' }}
                    placeholder='Status'
                    options={todoStatuses.map((value) => ({ label: value, value }))}
                />
            </ant.Form.Item>

            <ant.Form.Item>
                <ant.Button type='primary' htmlType='submit' children='Save' loading={isLoading} />
            </ant.Form.Item>
        </ant.Form>
    );
};
