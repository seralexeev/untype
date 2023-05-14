import { ComponentType, FC, Fragment, ReactNode, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';

import { AuthPage } from '../auth/AuthPage';
import { useProfile } from '../auth/UserProvider';
import { Layout } from '../layout/Layout';
import { TodoList } from '../todo/TodoList';
import { ui } from '../ui';
import { ScrollToTop } from './ScrollToTop';
import { HomePage } from '../home/HomePage';

export const AppRouter: FC = () => {
    return (
        <BrowserRouter basename='/'>
            <ScrollToTop />
            <AuthRequired>
                <Routes>
                    <Route path='/' element={<PageComponent Component={HomePage} title='Home' />} />
                    <Route path='/todo' element={<PageComponent Component={TodoList} title='Todo' />} />
                    <Route path='*' element={<ui.Box children='Page not found' marginBottom={8} />} />
                </Routes>
            </AuthRequired>
        </BrowserRouter>
    );
};

type RootRouterProps = {
    children: ReactNode;
};

export const AuthRequired: FC<RootRouterProps> = ({ children }) => {
    const { profile } = useProfile();

    return profile ? <Fragment children={children} /> : <AuthPage />;
};

type PageComponentProps = {
    Component: ComponentType;
    title: string;
};

const PageComponent: FC<PageComponentProps> = ({ Component, title }) => {
    const params = useParams();

    useEffect(() => {
        const prev = document.title;
        document.title = `🚀 untype | ${title}`;
        return () => {
            document.title = prev;
        };
    }, [title]);

    return (
        <Layout>
            <Component {...params} />
        </Layout>
    );
};
