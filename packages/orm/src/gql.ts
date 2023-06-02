import PgManyToManyPlugin from '@graphile-contrib/pg-many-to-many';
import PgOrderByRelatedPlugin from '@graphile-contrib/pg-order-by-related';
import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector';
import { InternalError, UnreachableError } from '@untype/core';
import { constantCase } from 'change-case';
import {
    ArgumentNode,
    DocumentNode,
    FieldNode,
    GraphQLField,
    GraphQLScalarType,
    GraphQLSchema,
    GraphQLType,
    ListTypeNode,
    NamedTypeNode,
    OperationTypeNode,
    SelectionNode,
    SelectionSetNode,
    TypeNode,
    VariableDefinitionNode,
    execute,
    isListType,
    isNonNullType,
    isObjectType,
    print,
} from 'graphql';
import { Pool, PoolClient } from 'pg';
import { PostGraphileCoreOptions, createPostGraphileSchema } from 'postgraphile-core';
import ConnectionFilterPlugin from 'postgraphile-plugin-connection-filter';
import { PgMutationUpsertPlugin } from 'postgraphile-upsert-plugin';
import { NonNullRelationsPlugin } from './plugins/NonNullRelationsPlugin';
import { PgNumericToBigJsPlugin } from './plugins/PgNumericToBigJsPlugin';

export type GqlInvoke = <T = unknown>(type: 'query' | 'mutation', name: string, query: object) => Promise<T>;
export type GqlClient = { gql: GqlInvoke };

const options: PostGraphileCoreOptions = {
    appendPlugins: [
        NonNullRelationsPlugin,
        PgNumericToBigJsPlugin,
        ConnectionFilterPlugin,
        PgManyToManyPlugin,
        PgSimplifyInflectorPlugin,
        PgMutationUpsertPlugin,
        PgOrderByRelatedPlugin,
    ],
    graphileBuildOptions: {
        connectionFilterRelations: true,
        pgOmitListSuffix: true,
        pgSimplifyPatch: true,
        pgSimplifyAllRows: true,
        pgShortPk: true,
        connectionFilterUseListInflectors: true,
        connectionFilterAllowEmptyObjectInput: true,
    },
    dynamicJson: true,
    simpleCollections: 'both' as const,
    legacyRelations: 'omit' as const,
};

export class GqlQueryBuilder {
    private initPromise?: Promise<GraphQLSchema>;

    public constructor(private pool: Pool, private schemaName = 'public') {}

    public getSchema = async () => {
        if (!this.initPromise) {
            this.initPromise = createPostGraphileSchema(this.pool, this.schemaName, options);
            const schema = await this.initPromise;

            const dateType = schema.getType('Datetime') as GraphQLScalarType;
            if (dateType) {
                dateType.parseValue = (val: unknown) => (val instanceof Date ? val.toISOString() : val);
                dateType.serialize = (val: unknown) => (typeof val === 'string' ? new Date(val) : val);
            }
        }

        const schema = await this.initPromise;

        return {
            schema,
            queryFields: schema.getQueryType()?.getFields() ?? {},
            mutationFields: schema.getMutationType()?.getFields() ?? {},
        };
    };

    public query = async (client: PoolClient, operation: 'query' | 'mutation', name: string, query: object) => {
        const { schema, mutationFields, queryFields } = await this.getSchema();

        let field: GraphQLField<unknown, unknown> | undefined = undefined;
        switch (operation) {
            case 'mutation': {
                field = mutationFields[name];
                break;
            }
            case 'query': {
                field = queryFields[name];
                break;
            }

            default:
                throw new UnreachableError(operation);
        }

        if (!field) {
            throw new InternalError(`Field ${name} not found in ${operation}`, {
                data: { operation, name, query },
            });
        }

        const { document, variables } = this.createDocument(operation, query, field);

        const res = await execute({
            schema,
            document,
            rootValue: null,
            contextValue: { pgClient: client },
            variableValues: variables,
        });

        if (res.errors && res.errors.length > 0) {
            const cause = res.errors[0]?.originalError;
            const message = cause?.message ?? (res.errors[0]?.message || 'OrmError');
            throw new InternalError(message, {
                data: { errors: res.errors, query: print(document), variables },
                cause,
            });
        }

        return res.data?.root;
    };

    private traverseQuery = (
        query: unknown,
        queryField: GraphQLField<unknown, unknown>,
        options: { variables: Record<string, unknown>; variableDefinitions: VariableDefinitionNode[] },
    ): FieldNode => {
        const selections: SelectionNode[] = [];
        const argumentsArray: ArgumentNode[] = [];

        if (typeof query === 'object') {
            const fields = this.getFields(queryField.type);
            if (isQuery(query)) {
                const { selector, ...args } = query;
                query = selector;

                for (const [argName, argValue] of Object.entries(args)) {
                    if (argValue === undefined) {
                        continue;
                    }

                    const arg = queryField.args.find((x) => x.name === argName);
                    if (!arg) {
                        throw new InternalError(`Argument ${argName} not found in ${queryField.name}`, {
                            data: { query },
                        });
                    }

                    const finalArgName = `arg_${Object.keys(options.variables).length}`;
                    options.variables[finalArgName] =
                        argName === 'orderBy' && Array.isArray(argValue) ? this.buildOrderBy(argValue) : argValue;

                    options.variableDefinitions.push({
                        kind: 'VariableDefinition',
                        variable: {
                            kind: 'Variable',
                            name: { kind: 'Name', value: finalArgName },
                        },
                        type: this.getNode(arg.type),
                    });

                    argumentsArray.push({
                        kind: 'Argument',
                        name: { kind: 'Name', value: argName },
                        value: {
                            kind: 'Variable',
                            name: { kind: 'Name', value: finalArgName },
                        },
                    });
                }
            }

            if (query && typeof query === 'object') {
                const selectorEntries = Array.isArray(query) ? query.map((x) => [x, true]) : Object.entries(query);

                for (const [selectorName, selectorValue] of selectorEntries) {
                    const field = fields[selectorName];
                    if (!field) {
                        throw new InternalError(`Field ${selectorName} not found in ${queryField.name}`, {
                            data: { query, selectorName, selectorValue },
                        });
                    }

                    if (typeof selectorValue === 'boolean') {
                        selections.push({
                            kind: 'Field',
                            name: { kind: 'Name', value: selectorName },
                        });
                    } else {
                        selections.push(this.traverseQuery(selectorValue, field, options));
                    }
                }
            }
        }

        const selectionSet: SelectionSetNode = {
            kind: 'SelectionSet',
            selections,
        };

        return {
            kind: 'Field',
            name: { kind: 'Name', value: queryField.name },
            selectionSet,
            arguments: argumentsArray,
        };
    };

    private buildOrderBy = (orderBy: Array<[string | [string, string], string]>) => {
        return orderBy.map(([field, direction]) => {
            if (Array.isArray(field) && field.length === 2) {
                const [byRelated, relatedField] = field;
                return `${constantCase(byRelated)}_BY_${constantCase(byRelated)}_ID__${constantCase(
                    relatedField,
                )}_${direction}`;
            }

            return `${constantCase(field)}_${direction}`;
        });
    };

    private createDocument = (operation: OperationTypeNode, query: unknown, field: GraphQLField<unknown, unknown>) => {
        const variableDefinitions: VariableDefinitionNode[] = [];
        const variables: Record<string, unknown> = {};

        const document: DocumentNode = {
            kind: 'Document',
            definitions: [
                {
                    kind: 'OperationDefinition',
                    operation,
                    variableDefinitions,
                    selectionSet: {
                        kind: 'SelectionSet',
                        selections: [
                            {
                                ...this.traverseQuery(query, field, { variables, variableDefinitions }),
                                alias: { kind: 'Name', value: 'root' },
                            },
                        ],
                    },
                },
            ],
        };

        return { document, variables };
    };

    private getFields = (type: GraphQLType) => {
        if (isNonNullType(type)) {
            type = type.ofType;
        }

        if (isListType(type)) {
            type = type.ofType;
        }

        if (isNonNullType(type)) {
            type = type.ofType;
        }

        if (!isObjectType(type)) {
            throw new InternalError('Not an object type', {
                data: { type },
            });
        }

        return type.getFields();
    };

    private getNode = (type: GraphQLType): TypeNode => {
        if (isNonNullType(type)) {
            return {
                kind: 'NonNullType',
                type: this.getNode(type.ofType) as NamedTypeNode | ListTypeNode,
            };
        }

        if (isListType(type)) {
            return {
                kind: 'ListType',
                type: this.getNode(type.ofType),
            };
        }

        if (isNonNullType(type)) {
            return {
                kind: 'NonNullType',
                type: this.getNode(type.ofType) as NamedTypeNode | ListTypeNode,
            };
        }

        return {
            kind: 'NamedType',
            name: { kind: 'Name', value: type.name },
        };
    };
}

const isQuery = (value: unknown): value is { selector: unknown } => {
    return typeof value === 'object' && value !== null && 'selector' in value;
};
