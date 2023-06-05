import { IncomingMessage, OutgoingMessage } from 'node:http';

export type HttpContext = {
    req: IncomingMessage;
    res: OutgoingMessage;
};

export abstract class EndpointResponse {
    public abstract write(ctx: HttpContext): Promise<void> | void;
}

export class ContentResponse extends EndpointResponse {
    private content;
    private contentType;

    public constructor(options: { content: unknown; contentType?: string }) {
        super();

        this.content = options.content;
        this.contentType = options.contentType ?? 'text/plain';
    }

    public override write({ res }: HttpContext): void | Promise<void> {
        res.setHeader('Content-Type', this.contentType);
        res.end(this.content);
    }

    public static html = (strings: TemplateStringsArray, ...values: unknown[]) => {
        return new ContentResponse({ content: String.raw(strings, ...values), contentType: 'text/html' });
    };

    public static javascript = (strings: TemplateStringsArray, ...values: unknown[]) => {
        return new ContentResponse({ content: String.raw(strings, ...values), contentType: 'text/javascript' });
    };
}

export class JsonResponse extends EndpointResponse {
    private data;

    public constructor(options: { data: unknown }) {
        super();

        this.data = options.data;
    }

    public override write({ res }: HttpContext): void | Promise<void> {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(this.data ?? { void: true }));
    }
}

export class FileResponse extends EndpointResponse {
    private stream;
    private filename;
    private contentType;
    private download;

    public constructor(options: { stream: NodeJS.ReadableStream; filename: string; contentType?: string; download?: boolean }) {
        super();

        this.stream = options.stream;
        this.filename = options.filename;
        this.download = options.download ?? false;
        this.contentType = options.contentType ?? 'application/octet-stream';
    }

    public override write({ res }: HttpContext): void | Promise<void> {
        res.setHeader('Content-Type', this.contentType);

        if (this.download) {
            res.setHeader('Content-Disposition', `attachment; filename="${this.filename}"`);
        }

        this.stream.pipe(res);
    }
}
