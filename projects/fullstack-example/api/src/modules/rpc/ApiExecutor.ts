import { Pg } from '@untype/pg';
import { ExpressExecutor } from '@untype/rpc-express';
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { singleton } from 'tsyringe';
import { Config } from '../../config';
import { AuthService } from '../auth/AuthService';
import { ApiContext } from './ApiContext';
import { ApiUser } from './ApiUser';

@singleton()
export class ApiExecutor extends ExpressExecutor<ApiContext, ApiUser> {
    private authClient;

    public constructor(private pg: Pg, private config: Config, private authService: AuthService) {
        super();

        this.authClient = new OAuth2Client({
            clientId: this.config.auth.google.clientId,
            clientSecret: this.config.auth.google.clientSecret,
            redirectUri: 'postmessage',
        });
    }

    public override invoke = async ({ resolve, res, req }: typeof this.types.invoke) => {
        return this.pg.transaction(async (t) => {
            return resolve({ t, res: res as any as Response, req: req as any as Request });
        });
    };

    public override auth = async (ctx: typeof this.types.auth) => {
        const email = await this.getEmail(ctx);
        const user = this.authService.getUser(email);
        if (!user) {
            this.authService.clearTokens(ctx.res);
        }

        return user;
    };

    private getEmail = async ({ req, res }: typeof this.types.auth) => {
        const { access_token, refresh_token } = req.cookies;
        if (typeof access_token !== 'string' || typeof refresh_token !== 'string') {
            return null;
        }

        try {
            return await this.authClient.getTokenInfo(access_token).then((x) => x.email ?? null);
        } catch (cause) {
            const tokens = await this.authService.tryRefreshToken(refresh_token);
            if (!tokens) {
                return null;
            }

            this.authService.setTokens(res, tokens);

            return tokens.email;
        }
    };
}
