import { FC, useEffect } from 'react';
import { useLocation } from 'react-router';

type ScrollToTop = {
    element?: { scrollTo: (options?: ScrollToOptions) => void };
};

export const ScrollToTop: FC<ScrollToTop> = ({ element = window }) => {
    const { pathname } = useLocation();

    useEffect(() => {
        element?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, [element, pathname]);

    return null;
};
