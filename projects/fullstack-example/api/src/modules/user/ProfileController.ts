import { singleton } from 'tsyringe';
import z from 'zod';
import { rpc } from '../rpc';

@singleton()
export class ProfileController {
    public ['profile/get'] = rpc({
        input: z.object({ id: z.string() }),
        resolve: async ({ input }) => {
            return {
                id: input.id,
                name: 'John Doe',
            };
        },
    });
}
