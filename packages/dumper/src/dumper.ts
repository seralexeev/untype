/* eslint-disable @typescript-eslint/no-unused-vars */

import cleanStack from 'clean-stack';

type Options = {
    basePath: string;
};

export class StdDumper {
    public constructor(private options: Options = { basePath: '/' }) {}

    public dump = (obj: unknown) => {
        return this.dumpImpl({ path: '', seen: new Set() }, obj);
    };

    protected hasToJSON(ctx: DumpContext, obj: unknown): obj is { toJSON: () => void } {
        if (!obj) {
            return false;
        }

        return typeof obj === 'object' && 'toJSON' in obj && typeof obj.toJSON === 'function';
    }

    protected findObjectKeys(ctx: DumpContext, obj: unknown) {
        const result = new Set<string>();

        while (obj) {
            for (const p of Object.getOwnPropertyNames(obj)) {
                result.add(p);
            }

            obj = Object.getPrototypeOf(obj);
        }

        return result;
    }

    protected isFieldSerializable(ctx: DumpContext, key: string) {
        if (key.startsWith('_')) {
            return false;
        }

        switch (key) {
            case 'constructor':
            case '__defineGetter__':
            case '__defineSetter__':
            case 'hasOwnProperty':
            case '__lookupGetter__':
            case '__lookupSetter__':
            case 'isPrototypeOf':
            case 'propertyIsEnumerable':
            case 'toString':
            case 'valueOf':
            case '__proto__':
            case 'toLocaleString':
                return false;
        }

        return true;
    }

    protected isFieldSensitive(ctx: DumpContext, key: string) {
        return false;
    }

    protected serializePromise(ctx: DumpContext, obj: Promise<unknown>) {
        return '[object Promise]';
    }

    protected serializeMap(ctx: DumpContext, obj: Map<unknown, unknown>) {
        const map: Record<string, DumpedValue> = {};
        for (const [key, value] of obj) {
            const keyStr = String(key);
            map[keyStr] = this.dumpImpl(this.deriveDumpContext(ctx, keyStr), value);
        }

        return map;
    }

    protected serializeSet(ctx: DumpContext, obj: Set<unknown>) {
        const set: DumpedValue[] = [];
        for (const value of obj) {
            set.push(this.dumpImpl(ctx, value));
        }

        return set;
    }

    protected serializeArrayBufferView(ctx: DumpContext, obj: ArrayBufferView) {
        return `[${obj.constructor.name}]`;
    }

    protected serializeStream(obj: { pipe?: unknown }) {
        return '[object Stream]';
    }

    protected serializeError(ctx: DumpContext, obj: Error) {
        if (obj.stack) {
            obj.stack = cleanStack(obj.stack, {
                pretty: true,
                basePath: this.options.basePath + '/',
            });
        }

        return this.dumpObject(ctx, obj);
    }

    protected serializeArray(ctx: DumpContext, obj: unknown[]) {
        return obj.map((value) => this.dumpImpl(ctx, value));
    }

    protected serializeRegExp(ctx: DumpContext, obj: RegExp) {
        return `[object RegExp(${String(obj)})]`;
    }

    protected serializeSymbol(ctx: DumpContext, obj: symbol) {
        return `[object Symbol(${String(obj)})]`;
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    protected serializeFunction(ctx: DumpContext, obj: Function) {
        // we ignore functions
        // return `[object Function(${obj.name})]`;
        return undefined;
    }

    protected serializeDate(ctx: DumpContext, obj: Date) {
        return obj.toISOString();
    }

    protected dumpImpl(ctx: DumpContext, obj: unknown): DumpedValue {
        if (ctx.seen.has(obj)) {
            return '[Circular]';
        }

        if (typeof obj === 'undefined') {
            return obj;
        }

        if (obj === null) {
            return obj;
        }

        if (typeof obj === 'boolean') {
            return obj;
        }

        if (typeof obj === 'string') {
            return obj;
        }

        if (typeof obj === 'number') {
            return obj;
        }

        if (typeof obj === 'bigint') {
            return obj.toString();
        }

        if (typeof obj === 'symbol') {
            return this.serializeSymbol(ctx, obj);
        }

        if (typeof obj === 'function') {
            return this.serializeFunction(ctx, obj);
        }

        if (obj instanceof Date) {
            return this.serializeDate(ctx, obj);
        }

        ctx.seen.add(obj);

        if (this.hasToJSON(ctx, obj)) {
            try {
                return this.dumpImpl(ctx, obj.toJSON());
            } catch (error) {
                return '[Thrown an error in toJSON]';
            }
        }

        if (ArrayBuffer.isView(obj)) {
            return this.serializeArrayBufferView(ctx, obj);
        }

        if (Array.isArray(obj)) {
            return this.serializeArray(ctx, obj);
        }

        if (obj instanceof RegExp) {
            this.serializeRegExp(ctx, obj);
        }

        if (obj !== null && typeof obj === 'object' && 'pipe' in obj && typeof obj.pipe === 'function') {
            return this.serializeStream(obj);
        }

        if (obj instanceof Promise) {
            return this.serializePromise(ctx, obj);
        }

        if (obj instanceof Map) {
            return this.serializeMap(ctx, obj);
        }

        if (obj instanceof Set) {
            return this.serializeSet(ctx, obj);
        }

        if (typeof obj !== 'object') {
            return String(obj);
        }

        if (obj instanceof Error) {
            return this.serializeError(ctx, obj);
        }

        return this.dumpObject(ctx, obj);
    }

    protected dumpObject(ctx: DumpContext, obj: unknown) {
        const record: Record<string, DumpedValue> = {};
        for (const key of this.findObjectKeys(ctx, obj)) {
            if (!this.isFieldSerializable(ctx, key)) {
                continue;
            }

            if (this.isFieldSensitive(ctx, key)) {
                record[key] = '***';
                continue;
            }

            try {
                record[key] = this.serializeKey(ctx, obj, key);
            } catch (error) {
                record[key] = '[Thrown an error when dumping value]';
            }
        }

        return record;
    }

    protected serializeKey(ctx: DumpContext, obj: unknown, key: string) {
        return this.dumpImpl(this.deriveDumpContext(ctx, key), (obj as Record<string, unknown>)[key]);
    }

    protected deriveDumpContext(ctx: DumpContext, key: string): DumpContext {
        return { seen: ctx.seen, path: ctx.path ? `${ctx.path}.${key}` : key };
    }
}

export type DumpContext = { path: string; seen: Set<unknown> };

type DumpedValue = unknown;
