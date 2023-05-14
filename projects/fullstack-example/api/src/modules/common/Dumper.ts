import { DumpContext, StdDumper } from '@untype/dumper';
import { singleton } from 'tsyringe';
import { ZodError } from 'zod';

@singleton()
export class Dumper extends StdDumper {
    public override serializeError(ctx: DumpContext, error: Error) {
        if (error instanceof ZodError) {
            error = this.overrideZodError(error);
        }

        return super.serializeError(ctx, error);
    }

    private overrideZodError = (error: ZodError) => {
        return Object.defineProperty(error, 'message', {
            get: () => error.name,
            configurable: true,
        });
    };
}
