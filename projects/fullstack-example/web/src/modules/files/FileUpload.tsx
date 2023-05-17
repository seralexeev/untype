import UploadOutlined from '@ant-design/icons/UploadOutlined';
import { exists } from '@untype/core';
import { RpcOutput } from '@untype/fullstack-example-api';
import { FC, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRpc } from '../rpc/useRpc';
import { ui } from '../ui';

type FileDropProps = {
    children: (open: () => void) => ReactNode;
    onUpload?: (files: Array<RpcOutput<'files/upload'>>) => void;
};

export const FileDrop: FC<FileDropProps> = ({ children, onUpload }) => {
    const { mutateAsync } = useRpc('files/upload').useMutation();

    const onDrop = (files: File[]) => {
        const items = files.map((file) => ({ file, promise: mutateAsync(file) }));
        void Promise.allSettled(items.map((x) => x.promise)).then((result) => {
            return onUpload?.(result.map((x) => (x.status === 'fulfilled' ? x.value : null)).filter(exists));
        });
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, noClick: true });

    return (
        <div
            {...getRootProps()}
            style={{
                height: '100%',
                width: '100%',
                position: 'relative',
                outline: 'none',
                minHeight: isDragActive ? 128 : undefined,
            }}
        >
            <input {...getInputProps()} />
            {children(open)}
            {isDragActive && (
                <ui.Box
                    top={0}
                    right={0}
                    bottom={0}
                    left={0}
                    position='absolute'
                    zIndex={1}
                    background='#fff'
                    opacity={0.95}
                    padding={16}
                >
                    <ui.Box
                        border='2px dashed #ddd'
                        width='100%'
                        height='100%'
                        display='flex'
                        justifyContent='center'
                        alignItems='center'
                        flexDirection='column'
                    >
                        <UploadOutlined />
                        <ui.Box marginTop={8} children='Drop files to Upload' />
                    </ui.Box>
                </ui.Box>
            )}
        </div>
    );
};
