import { singleton } from 'tsyringe';
import { Config } from '../../config';
import { rpc } from '../rpc';

@singleton()
export class ConfigController {
    private config;

    public constructor({ config }: Config) {
        this.config = config;
    }

    public ['config/get'] = rpc({
        anonymous: true,
        resolve: async () => {
            return {
                env: this.config.env,
                version: this.config.version,
                auth: {
                    google: {
                        clientId: this.config.auth.google.clientId,
                    },
                },
            };
        },
    });
}
