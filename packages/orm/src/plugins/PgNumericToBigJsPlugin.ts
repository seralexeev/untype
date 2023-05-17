import { InternalError } from '@untype/core';
import Big from 'big.js';
import { GraphQLScalarType, Kind } from 'graphql';
import { SchemaBuilder } from 'postgraphile';

const DecimalScalar = new GraphQLScalarType({
    name: 'Decimal',
    description: 'Decimal type',
    parseValue: (value: unknown) => value as Big,
    serialize: (value: unknown) => new Big(value as string),
    parseLiteral(ast) {
        if (ast.kind === Kind.STRING) {
            return new Big(ast.value);
        }

        throw new InternalError('Unable to parse Big literal', {
            data: { ast },
        });
    },
});

export const PgNumericToBigJsPlugin = (builder: SchemaBuilder) => {
    builder.hook('build', (build) => {
        build.pgRegisterGqlTypeByTypeId('1700', () => DecimalScalar);
        return build;
    });
};
