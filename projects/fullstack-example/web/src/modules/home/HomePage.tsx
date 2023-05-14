import { FC } from 'react';
import { useProfile } from '../auth/UserProvider';
import { ui } from '../ui';

export const HomePage: FC = () => {
    const { profile } = useProfile();

    return (
        <ui.Box>
            <h1>Hi {profile.firstName} 👋</h1>
        </ui.Box>
    );
};
