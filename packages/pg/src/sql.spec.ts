import { describe, expect, it } from '@jest/globals';
import dedent from 'dedent';

import { makeInsertFragment, raw, sql } from './sql';

describe('SqlFragment', () => {
    it.each([
        ['string', 'string'],
        ['number', 123],
        ['boolean (true)', true],
        ['boolean (false)', false],
        ['Date', new Date('2010-01-01T00:00:00Z')],
        ['null', null],
        ['undefined', undefined],
        ['function', () => 1],
        ['string array', ['string 1', 'string 2']],
        ['number array', [1, 2]],
        ['object', { string: 'string', number: 1, boolean: true, null: null, undefined }],
    ])('Should receive %s', (_type, value) => {
        const query = sql`UPDATE users SET field = ${value}`;
        expect(query.values).toEqual([value]);
    });

    it('Simple query', () => {
        const query = sql`SELECT * FROM users`;

        expect(query.text).toEqual('SELECT * FROM users');
        expect(query.values).toEqual([]);
    });

    it('Simple query with 1 params', () => {
        const query = sql`SELECT * FROM users WHERE id = ${1}`;

        expect(query.text).toEqual('SELECT * FROM users WHERE id = $1');
        expect(query.values).toEqual([1]);
    });

    it('Simple query with 2 params', () => {
        const query = sql`SELECT * FROM users WHERE id = ${1} AND name ilike ${'untype'}`;

        expect(query.text).toEqual('SELECT * FROM users WHERE id = $1 AND name ilike $2');
        expect(query.values).toEqual([1, 'untype']);
    });

    it('Simple child fragment', () => {
        const tableName = sql`users`;
        const query = sql`SELECT * FROM ${tableName}`;

        expect(query.text).toEqual('SELECT * FROM users');
        expect(query.values).toEqual([]);
    });

    it('Raw fragment', () => {
        const tableName = raw('users');
        const query = sql`SELECT * FROM ${tableName}`;

        expect(query.text).toEqual('SELECT * FROM users');
        expect(query.values).toEqual([]);
    });

    it('Many inner fragments', () => {
        const q1 = sql`SELECT * FROM users WHERE name ilike ${'untype'}`;
        const q2 = sql`SELECT * FROM roles WHERE role_group IN (${['a', 'b']})`;
        const field = raw('name');

        const query = sql`
            SELECT u.${field}, r.name
            FROM (${q1}) AS u
            INNER JOIN (${q2}) AS r ON u.role_id = r.id
        `;

        expect(query.text).toEqual(dedent`
            SELECT u.name, r.name
            FROM (SELECT * FROM users WHERE name ilike $1) AS u
            INNER JOIN (SELECT * FROM roles WHERE role_group IN ($2)) AS r ON u.role_id = r.id
        `);
        expect(query.values).toEqual(['untype', ['a', 'b']]);
    });

    it('Builds column values pairs from object', () => {
        const { columns, values } = makeInsertFragment({
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@gmail.com',
            phone: '123456789',
            age: 30,
        });

        const query = sql`INSERT INTO customers (${columns}) VALUES (${values}) WHERE id = ${'1'}`;

        expect(query.text).toEqual(
            'INSERT INTO customers (first_name, last_name, email, phone, age) VALUES ($1, $2, $3, $4, $5) WHERE id = $6',
        );
        expect(query.values).toEqual(['John', 'Doe', 'john@gmail.com', '123456789', 30, '1']);
    });
});
