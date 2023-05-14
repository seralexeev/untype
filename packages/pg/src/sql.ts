import { InternalError } from '@untype/core';
import dedent from 'dedent';

export class SqlFragment {
    private strings: string[] = [];

    public values: unknown[] = [];
    public text;

    private constructor(strings: readonly string[], values: readonly unknown[]) {
        const [firstFragment] = strings;
        if (firstFragment === undefined) {
            throw new InternalError('SqlFragment must have at least one string', {
                data: { strings, values },
            });
        }

        this.strings.push(firstFragment);

        let pos = 0;
        for (let i = 0; i < values.length; i++) {
            const currentValue = values[i];
            const nextString = strings[i + 1];

            if (currentValue instanceof SqlFragment) {
                this.strings[pos] += currentValue.strings[0];

                let innerIndex = 0;
                while (innerIndex < currentValue.values.length) {
                    this.values[pos++] = currentValue.values[innerIndex++];
                    const innerString = currentValue.strings[innerIndex];
                    if (typeof innerString === 'string') {
                        this.strings[pos] = innerString;
                    }
                }

                this.strings[pos] += nextString;
            } else {
                this.values[pos++] = currentValue;
                if (typeof nextString === 'string') {
                    this.strings[pos] = nextString;
                }
            }
        }

        this.text = dedent(this.strings.reduce((acc, str, i) => acc + `$${i}${str}`));
    }

    public static rawFragment = (value: string) => new SqlFragment([value], []);
    public static sqlFragment = (strings: TemplateStringsArray, ...values: unknown[]) => new SqlFragment(strings, values);
    public static joinFragment = (values: unknown[], separator = ', ', prefix = '', suffix = '') => {
        if (values.length === 0) {
            throw new InternalError('Cannot join an empty array');
        }

        return new SqlFragment([prefix, ...new Array(values.length - 1).fill(separator), suffix], values);
    };
}

export const raw = SqlFragment.rawFragment;
export const sql = SqlFragment.sqlFragment;
export const join = SqlFragment.joinFragment;
export const makeInsertFragment = <T extends string>(value: Record<T, unknown>) => {
    const entries = Object.entries(value);

    return {
        columns: join(entries.map(([key]) => raw(key))),
        values: join(entries.map(([, value]) => value)),
        set: (columns: T[]) => join([...new Set(columns)].map((x) => sql`${raw(x)} = ${value[x]}`)),
    };
};

export const empty = raw('');
