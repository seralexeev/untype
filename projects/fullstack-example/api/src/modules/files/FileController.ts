import { FileInput, FileResponse, fileInput } from '@untype/rpc';
import { Readable } from 'node:stream';
import { singleton } from 'tsyringe';
import z from 'zod';
import { rest, rpc } from '../rpc';

@singleton()
export class FileController {
    private files = new Map<string, FileInput>();

    public ['files/upload'] = rpc({
        input: fileInput,
        resolve: async ({ input }) => {
            const id = `file-${this.files.size + 1}`;
            this.files.set(id, input);

            return { id, url: `/files/${id}` };
        },
    });

    public ['GET /files/:id'] = rest({
        resolve: async ({ params }) => {
            const file = this.files.get(z.string().parse(params.id));

            if (!file) {
                throw new Error(`File not found: ${params.id}`);
            }

            return new FileResponse({
                stream: Readable.from(file.buffer),
                contentType: file.mimetype ?? 'application/octet-stream',
                filename: file.originalname ?? 'file',
            });
        },
    });
}
