/* eslint-disable no-console */

import { LoggerType, UnreachableError } from '@untype/core';
import { StdDumper } from '@untype/dumper';
import { gray, green, red, yellow } from 'colorette';
import yaml from 'js-yaml';
import { env } from 'node:process';

export class untypeLogger implements LoggerType {
    private highlight;
    private dumper;
    private level;
    private levelIndex;
    private pretty;
    private logger;

    public dump;

    public debug: LogFunction = (message, meta) => this.logImpl('debug', message, meta);
    public info: LogFunction = (message, meta) => this.logImpl('info', message, meta);
    public warn: LogFunction = (message, meta) => this.logImpl('warn', message, meta);
    public error: LogFunction = (message, meta) => this.logImpl('error', message, meta);

    public constructor(options: LoggerOptions = {}) {
        this.pretty = options.pretty ?? 'none';
        this.level = options.level ?? 'debug';
        this.levelIndex = logLevels.indexOf(this.level);
        this.dumper = options.dumper ?? new StdDumper();
        this.dump = this.dumper.dump;

        this.logger = console;

        if (this.pretty === 'yaml') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                this.highlight = require('cli-highlight').highlight;
            } catch (error) {
                console.error('Unable to load cli-highlight');
            }
        }

        process.on('unhandledRejection', (error) => {
            this.error('UnhandledRejection', error);
        });
    }

    private logImpl = (level: LogLevel, message: string, data?: unknown) => {
        const logLevel = logLevels.indexOf(level);
        if (logLevel < this.levelIndex) {
            return;
        }

        data = this.dumper.dump(data);
        const date = new Date();

        if (this.pretty === 'none') {
            this.logger.log(JSON.stringify({ level, message, date, data }));
            return;
        }

        const time = gray(
            `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
                .getSeconds()
                .toString()
                .padStart(2, '0')}`,
        );

        const levelColor = this.getColor(level);

        this.logger.log(`${time} ${levelColor(level.toUpperCase())} ${message}`);
        if (data === undefined) {
            return;
        }

        switch (this.pretty) {
            case 'yaml': {
                this.printYaml(data);
                break;
            }
            case 'json': {
                this.logger.log(JSON.stringify(data, null, 2));
                break;
            }
            default: {
                throw new UnreachableError(this.pretty);
            }
        }

        this.logger.log('');
    };

    private printYaml = (obj: unknown) => {
        let message = yaml.dump(obj, { skipInvalid: true, lineWidth: 240 }).trim();

        if (this.highlight) {
            message = this.highlight(message, {
                language: 'yaml',
                ignoreIllegals: true,
                theme: { attr: gray, string: green, number: red },
            });
        }

        const lines = message.split('\n').map((x, i, ar) => `${gray(this.getFrameSymbol(i, ar.length))} ` + x);
        for (const line of lines) {
            this.logger.log(line);
        }
    };

    private getFrameSymbol = (index: number, length: number) => {
        switch (true) {
            case length === 0:
                return '';
            case length === 1:
                return ' ';
            case index === 0:
                return '┌';
            case index === length - 1:
                return '└';
            default:
                return '│';
        }
    };

    private getColor = (level: LogLevel) => {
        switch (level) {
            case 'debug':
                return gray;
            case 'info':
                return green;
            case 'warn':
                return yellow;
            case 'error':
                return red;
            default:
                throw new UnreachableError(level);
        }
    };
}

export type PrettyPrint = 'none' | 'json' | 'yaml';
const logLevels = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof logLevels)[number];
export type Dumper = { dump: (value: unknown) => unknown };

type LogFunction = (message: string, meta?: unknown) => void;
export type LoggerOptions = {
    level?: LogLevel;
    pretty?: PrettyPrint;
    dumper?: Dumper;
};

export const logger = new untypeLogger({
    level: 'debug',
    pretty: env.NODE_ENV === 'production' ? 'json' : 'yaml',
});
