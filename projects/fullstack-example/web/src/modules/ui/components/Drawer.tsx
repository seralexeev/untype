import * as ant from 'antd';
import { createContext, FC, ReactNode, useContext, useRef, useState } from 'react';

export type UseDrawerOptions = Omit<ant.DrawerProps, 'children' | 'title' | 'width'> & {
    title: ReactNode;
    width?: string | number;
    content: (args: { onClose: () => void }) => ReactNode;
};

type ContextType = {
    openDrawer: (options: UseDrawerOptions) => void;
};

const Context = createContext<ContextType | null>(null);

export const DrawerProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const ref = useRef(0);
    const [drawers, setDrawers] = useState<Array<{ id: number } & UseDrawerOptions>>([]);

    const openDrawer = (options: UseDrawerOptions) => {
        setDrawers((prev) => [...prev, { id: ref.current++, ...options }]);
    };

    const root = drawers.reduceRight((acc, options) => {
        return (
            <Drawer
                key={options.id}
                options={options}
                onCloseAnimationEnd={() => setDrawers((prev) => prev.filter((x) => x.id !== options.id))}
                stack={acc}
            />
        );
    }, null as ReactNode);

    return (
        <Context.Provider value={{ openDrawer }}>
            {children}
            {root}
        </Context.Provider>
    );
};

export const useDrawer = () => {
    const context = useContext(Context);
    if (!context) {
        throw new Error('useDrawer must be used within a DrawerProvider');
    }

    return context.openDrawer;
};

type DrawerProps = {
    options: UseDrawerOptions;
    onCloseAnimationEnd: () => void;
    stack: ReactNode;
};

const Drawer: FC<DrawerProps> = ({ options: { content, ...options }, onCloseAnimationEnd, stack }) => {
    const [visible, onChange] = useState(true);
    const onClose = () => onChange(false);

    return (
        <ant.Drawer
            {...options}
            destroyOnClose
            width={options?.width ?? 1024}
            contentWrapperStyle={{ maxWidth: '100%', ...options?.contentWrapperStyle }}
            onClose={onClose}
            open={visible}
            bodyStyle={{ background: '#F4F7FC' }}
            afterOpenChange={(state) => {
                if (!state) {
                    onCloseAnimationEnd();
                }
            }}
        >
            {stack}
            <ant.Card
                children={content({ onClose })}
                style={{ height: '100%' }}
                bodyStyle={{ height: '100%', overflow: 'auto' }}
            />
        </ant.Drawer>
    );
};
