import { UnauthorizedError } from '@untype/core';
import { singleton } from 'tsyringe';
import { z } from 'zod';
import { e } from '../../entities';
import { rpc } from '../rpc';
import { AuthService } from './AuthService';

@singleton()
export class AuthController {
    public constructor(private authService: AuthService) {}

    public ['auth/login'] = rpc({
        anonymous: true,
        input: z.object({ code: z.string() }),
        resolve: async ({ ctx, input }) => {
            const tokens = await this.authService.getTokenByCode(input.code);
            if (!tokens || !tokens.access_token || !tokens.refresh_token) {
                throw new UnauthorizedError('No access_token or refresh_token returned from Google');
            }

            const payload = await this.authService.verifyIdToken(tokens.id_token);
            if (!payload) {
                throw new UnauthorizedError('Invalid id_token');
            }

            const { email, givenName, familyName } = payload;

            let user = await this.authService.getUser(payload.email);
            if (!user) {
                user = await e.Users.upsert(ctx.t, {
                    where: { email },
                    item: {
                        email,
                        firstName: givenName ?? 'Unknown',
                        lastName: familyName ?? 'Unknown',
                    },
                    selector: ['id'],
                });
            }

            this.authService.setTokens(ctx.res, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
            });
        },
    });

    public ['auth/profile'] = rpc({
        resolve: async ({ ctx }) => {
            const profile = await e.Users.findByPkOrError(ctx.t, {
                pk: { id: ctx.auth.id },
                selector: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });

            return profile;
        },
    });

    public ['auth/logout'] = rpc({
        anonymous: true,
        resolve: async ({ ctx }) => {
            this.authService.clearTokens(ctx.res);
        },
    });
}
