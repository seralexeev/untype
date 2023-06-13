export type LoggerType = {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;

    dump: (data: unknown) => unknown;
};

export class ConsoleLogger implements LoggerType {
    debug = (message: string, data?: unknown) => console.debug(message, data);
    info = (message: string, data?: unknown) => console.info(message, data);
    warn = (message: string, data?: unknown) => console.warn(message, data);
    error = (message: string, data?: unknown) => console.error(message, data);

    dump = (data: unknown) => data;
}
