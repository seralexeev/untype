import { singleton } from 'tsyringe';
import { Config } from '../../config';
import { rpc } from '../rpc';

@singleton()
export class ConfigController {
    public constructor(private config: Config) {}

    public ['config/get'] = rpc({
        anonymous: true,
        resolve: async () => {
            return {
                env: this.config.env,
                auth: {
                    google: {
                        clientId: this.config.auth.google.clientId,
                    },
                },
            };
        },
    });
}
