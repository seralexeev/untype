export class UnreachableError extends Error {
    public constructor(public value: never, message?: string) {
        super(`${message ?? 'Unreachable code reached'} (${value})`);
    }
}

export function never<T>(check: never, defaultValue: T): T;
export function never(): never;
export function never(...args: unknown[]) {
    if (args.length > 0) {
        return args[1];
    }

    throw new UnreachableError(null as never);
}
