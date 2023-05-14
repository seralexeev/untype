export abstract class ServiceError extends Error {
    #options;

    public constructor(
        message: string,
        options?: {
            code?: string;
            cause?: unknown;
            data?: unknown;
            publicMessage?: string;
        },
    ) {
        super(message, { cause: options?.cause as Error });
        this.name = this.constructor.name;
        this.#options = options;
    }

    public shouldLog() {
        return true;
    }

    public statusCode() {
        return 400;
    }

    protected defaultCode() {
        return 'SERVICE_ERROR';
    }

    public get publicMessage() {
        return this.#options?.publicMessage;
    }

    public get data() {
        return this.#options?.data;
    }

    public get code() {
        return this.#options?.code ?? this.defaultCode();
    }
}

export class InternalError extends ServiceError {
    protected override defaultCode() {
        return 'INTERNAL_ERROR';
    }

    public override statusCode() {
        return 500;
    }
}

export class BadRequestError extends ServiceError {
    protected override defaultCode() {
        return 'BAD_REQUEST';
    }
}

export class NotFoundError extends ServiceError {
    protected override defaultCode() {
        return 'NOT_FOUND';
    }
}

export class UnauthorizedError extends ServiceError {
    protected override defaultCode() {
        return 'UNAUTHORIZED';
    }

    public override statusCode() {
        return 401;
    }

    public override shouldLog() {
        return false;
    }
}

export class ForbiddenError extends ServiceError {
    protected override defaultCode() {
        return 'FORBIDDEN';
    }

    public override statusCode() {
        return 400;
    }
}
