import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import * as ant from 'antd';
import { FC } from 'react';
import { ui } from '../ui';
import { FileDrop } from './FileUpload';

type ImageInputProps = {
    value?: string | null;
    onChange?: (value: string | null) => void;
    shouldOpenDrawer?: boolean;
};

export const ImageInput: FC<ImageInputProps> = ({ onChange, value }) => {
    return (
        <FileDrop
            onUpload={(x) => onChange?.(x[0]?.url ?? null)}
            children={(openDialog) => (
                <ui.Box width={128}>
                    {value ? (
                        <img src={`api${value}`} style={{ width: 128, height: 128, objectFit: 'cover' }} />
                    ) : (
                        <ui.Box
                            onClick={() => openDialog()}
                            height={128}
                            display='flex'
                            justifyContent='center'
                            alignItems='center'
                            border='1px dashed #ddd'
                            cursor='pointer'
                        >
                            <PlusOutlined />
                        </ui.Box>
                    )}
                    <ui.Box marginTop={8}>
                        {value ? (
                            <ant.Button
                                onClick={() => onChange?.(null)}
                                children='Remove'
                                block
                                size='small'
                                icon={<DeleteOutlined />}
                            />
                        ) : (
                            <ant.Button
                                onClick={() => openDialog()}
                                children='Upload'
                                block
                                icon={<UploadOutlined />}
                                size='small'
                            />
                        )}
                    </ui.Box>
                </ui.Box>
            )}
        />
    );
};
