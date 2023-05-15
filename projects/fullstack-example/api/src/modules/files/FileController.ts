import { Logger } from '@untype/logger';
import { fileInput } from '@untype/rpc';
import { singleton } from 'tsyringe';
import { rpc } from '../rpc';

@singleton()
export class FileController {
    public constructor(private logger: Logger) {}

    public ['files/uploadPublic'] = rpc({
        input: fileInput,
        resolve: async ({ input }) => {
            this.logger.info('File upload', { input });
        },
    });
}
