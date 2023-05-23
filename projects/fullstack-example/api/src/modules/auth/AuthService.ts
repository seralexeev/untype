import { Logger } from '@untype/logger';
import { Pg } from '@untype/pg';
import { Response } from 'express';
import { OAuth2Client, UserRefreshClient } from 'google-auth-library';
import { singleton } from 'tsyringe';
import { Config } from '../../config';
import { e } from '../../entities';

@singleton()
export class AuthService {
    private authClient;

    public constructor(private config: Config, private pg: Pg, private logger: Logger) {
        this.authClient = new OAuth2Client({
            clientId: this.config.auth.google.clientId,
            clientSecret: this.config.auth.google.clientSecret,
            redirectUri: 'postmessage',
        });
    }

    public getUser = (email: string | null) => {
        if (!email) {
            return null;
        }

        return e.Users.findFirst(this.pg, {
            filter: { email: { equalTo: email } },
            selector: ['id'],
        });
    };

    public getTokenByCode = async (code: string) => {
        try {
            return await this.authClient.getToken(code).then((x) => x.tokens);
        } catch (error) {
            return null;
        }
    };

    public verifyIdToken = async (idToken: string | null | undefined) => {
        if (!idToken) {
            return null;
        }

        const payload = await this.authClient
            .verifyIdToken({ idToken })
            .then((x) => x.getPayload())
            .catch(() => {
                this.logger.error('Failed to verify Google ID token');
                return null;
            });

        if (!payload) {
            return null;
        }

        if (!payload.email_verified) {
            return null;
        }

        if (!payload.email) {
            return null;
        }

        return {
            email: payload.email,
            givenName: payload.given_name,
            familyName: payload.family_name,
            picture: payload.picture,
        };
    };

    public tryRefreshToken = async (refreshToken: string) => {
        try {
            const refreshClient = new UserRefreshClient({
                clientId: this.config.auth.google.clientId,
                clientSecret: this.config.auth.google.clientSecret,
                refreshToken,
            });

            const { credentials } = await refreshClient.refreshAccessToken();
            if (!credentials.access_token || !credentials.refresh_token || !credentials.id_token) {
                return null;
            }

            const payload = await this.verifyIdToken(credentials.id_token);
            if (!payload) {
                return null;
            }

            return {
                email: payload.email,
                accessToken: credentials.access_token,
                refreshToken: credentials.refresh_token,
                idToken: credentials.id_token,
            };
        } catch (error) {
            this.logger.error('Error refreshing token', { error });

            return null;
        }
    };

    public setTokens = (res: Response, { accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

        res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'strict', expires });
        res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'strict', expires });
    };

    public clearTokens = (res: Response) => {
        res.clearCookie('refresh_token');
        res.clearCookie('access_token');
    };
}
