import z from 'zod';

export type FileInput = {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
};

export interface File extends Blob {
    readonly lastModified: number;
    readonly name: string;
}

export const fileInput = z.custom<FileInput>((x: any) => {
    if (typeof x !== 'object' || x === null) {
        return false;
    }

    if (typeof x.mimetype !== 'string' || typeof x.originalname !== 'string') {
        return false;
    }

    if (!Buffer.isBuffer(x.buffer)) {
        return false;
    }

    return true;
}) as any as z.ZodType<FileInput, z.ZodTypeDef, File>;
