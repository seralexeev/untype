/* eslint-disable no-console */

import { constants } from 'node:fs';
import fs from 'node:fs/promises';

import { camelCase } from 'change-case';
import dedent from 'dedent';
import { pluralize } from 'graphile-build';
import {
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLSchema,
    GraphQLType,
    isInputObjectType,
    isListType,
    isNonNullType,
    isObjectType,
    isScalarType,
} from 'graphql';

import { Pg } from '@untype/pg';
import { groupBy, reduceBy } from '@untype/core';

import { GqlQueryBuilder } from './gql';

export const generateEntities = async ({
    directory,
    schemaName,
    connectionString,
    pgPackagePath,
    dryRun,
}: {
    directory: string;
    schemaName?: string;
    connectionString: string;
    pgPackagePath?: string;
    dryRun?: boolean;
}) => {
    const pg = new Pg({ master: connectionString });

    const { schema } = await new GqlQueryBuilder(pg.master.pool, schemaName).getSchema();

    try {
        await generate(schema, {
            directory,
            schemaName: schemaName ?? 'public',
            overrideFields: {},
            extraImports: {},
            globalImports: {
                JsonValue: 'type-fest',
                Big: 'big.js',
                interval: 'postgres-interval',
                GeoJSON: '@untype/geo',
                Polygon: '@untype/geo',
                Point: '@untype/geo',
                LineString: '@untype/geo',
                MultiPoint: '@untype/geo',
                MultiLineString: '@untype/geo',
                MultiPolygon: '@untype/geo',
                GeographyCollection: '@untype/geo',
            },
            dryRun,
            pgPackagePath,
        });
    } finally {
        await pg.close();
    }
};

const generate = async (
    schema: GraphQLSchema,
    {
        directory,
        overrideFields,
        extraImports,
        globalImports,
        pgPackagePath = '@untype/orm',
        dryRun,
        schemaName,
    }: {
        directory: string;
        schemaName: string;
        overrideFields: Record<string, string>;
        extraImports: Record<string, Record<string, string>>;
        globalImports: Record<string, string>;
        pgPackagePath?: string;
        dryRun?: boolean;
    },
) => {
    if (!dryRun) {
        const dirExists = await fileExists(`${directory}/generated`);
        if (dirExists) {
            await fs.rm(`${directory}/generated`, { recursive: true });
        }

        await fs.mkdir(`${directory}/generated`, { recursive: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allEntities = ((schema as any)._implementationsMap['Node'] as ReturnType<(typeof schema)['getImplementations']>)
        .objects;

    const entities = allEntities.filter((x) => x.name !== 'Query');
    const entityNames = entities.map((x) => x.name.toLocaleLowerCase());
    const primaryKeys = getPrimaryKeys(schema, entityNames);
    const allRequiredKeys = getRequiredFields(schema);

    const processedEntities = new Set<string>();
    const queue = [...entities];
    while (queue.length > 0) {
        const item = queue.shift();
        if (!item) {
            throw new Error('Item is null');
        }

        const entityName = item.name;
        if (entityName === 'Migration') {
            continue;
        }

        processedEntities.add(entityName);

        const lowerCaseEntityName = item.name.toLocaleLowerCase();
        const primaryKey = primaryKeys[lowerCaseEntityName] ?? {};
        const requiredKeys = allRequiredKeys[lowerCaseEntityName] ?? new Set();

        const { content, importEntities } = processType(item, {
            schema,
            entities: new Set(entities),
            primaryKey: primaryKey ?? {},
            requiredKeys: requiredKeys ?? new Set(),
            overrideFields,
            extraImports: extraImports[lowerCaseEntityName] ?? {},
            globalImports,
            pgPackagePath,
            schemaName,
        });

        if (!dryRun) {
            await fs.writeFile(`${directory}/generated/${entityName}.ts`, content);
        } else {
            console.log(`${entityName}.ts has been generated`, {
                entityName,
                content,
            });
        }

        const newEntities = [...importEntities.values()].filter((x) => !processedEntities.has(x.toString()));
        queue.push(...newEntities);
    }

    const processedEntitiesArray = [...processedEntities].sort();

    let indexContent = dedent`
        /* eslint-disable */

        import { EntityFieldsOverride, OverrideConstraint } from '${pgPackagePath}';\n\n
    `;
    for (const entityName of processedEntitiesArray) {
        indexContent += `export * from './${entityName}';\n`;
        indexContent += `import { ${entityName} } from './${entityName}';\n\n`;
    }

    indexContent += 'export type EntityMap = {\n';
    indexContent += processedEntitiesArray.map((x) => `    ${x}: ${x};`).join('\n');
    indexContent += '\n};\n\n';

    indexContent += `export type FieldsOverride<T extends OverrideConstraint<EntityMap>> = EntityFieldsOverride<EntityMap, T>;\n`;

    if (!dryRun) {
        await fs.writeFile(`${directory}/generated/index.ts`, indexContent);
        if (!(await fileExists(`${directory}/override.ts`))) {
            const override = dedent`
                import { FieldsOverride } from './generated';

                export type OverrideMap = FieldsOverride<{}>;
            `;

            await fs.writeFile(`${directory}/override.ts`, override);
        }
    }
};

const processType = (
    entityType: GraphQLObjectType<unknown, unknown>,
    {
        entities,
        schema,
        // primaryKey,
        requiredKeys,
        overrideFields,
        extraImports: { ...extraImports },
        globalImports,
        pgPackagePath,
        schemaName,
    }: {
        entities: Set<GraphQLObjectType<unknown, unknown>>;
        schema: GraphQLSchema;
        primaryKey: Partial<Record<string, string>>;
        requiredKeys: Set<string>;
        overrideFields: Record<string, string>;
        extraImports: Record<string, string>;
        globalImports: Record<string, string>;
        pgPackagePath: string;
        schemaName: string;
    },
) => {
    const entityName = entityType.name;
    const fields = entityType.getFields();

    type ForeignType = 'none' | 'connection' | 'link';
    const mappedFields: Array<{ name: string; type: string; foreignType: ForeignType }> = [];

    const importEntities = new Set<GraphQLObjectType>();
    const pgImportTypes = new Set<string>(['ApplyOverride']);
    const createField = schema.getMutationType()?.getFields()?.[`create${entityName}`];
    if (createField) {
        pgImportTypes.add('EntityAccessor');
    }

    const pkFields = schema
        .getQueryType()
        ?.getFields()
        ?.[camelCase(entityName)]?.args.map((x) => {
            let type = x.type;
            if (isNonNullType(type)) {
                type = type.ofType;
            }

            if (!isScalarType(type)) {
                throw new Error(`Expected scalar type for ${entityName}.${x.name}`);
            }

            return `${x.name}: ${getScalarType(type)}`;
        });

    if (pkFields?.length) {
        pgImportTypes.add('PrimaryKey');

        mappedFields.push({
            name: 'pk',
            type: `PrimaryKey<{ ${pkFields.join(', ')} }>`,
            foreignType: 'none',
        });
    }

    for (const [fieldName, field] of Object.entries(fields)) {
        if (fieldName === 'nodeId') {
            continue;
        }

        let type = field.type;

        let nullable = true;
        if (isNonNullType(type)) {
            nullable = false;
            type = type.ofType;
        }

        let isArray = false;
        if (isListType(type)) {
            isArray = true;
            type = type.ofType;
        }

        let foreignType: ForeignType = 'none';
        let typescriptType = '';

        if (isNonNullType(type)) {
            type = type.ofType;
        }

        if (isObjectType(type)) {
            if (type.name.endsWith('Connection')) {
                foreignType = 'connection';
                const connectionNodes = type.getFields()['nodes'];
                if (!connectionNodes) {
                    throw new Error(`Connection nodes not found for ${entityName}`);
                }

                type = connectionNodes.type;
            } else {
                foreignType = 'link';
            }

            if (isNonNullType(type)) {
                type = type.ofType;
            }

            if (isListType(type)) {
                type = type.ofType;
            }

            const linkName = type.toString();
            if (linkName !== entityName) {
                importEntities.add(type as GraphQLObjectType);
            }

            typescriptType = linkName;
        }

        if (isScalarType(type)) {
            typescriptType = getScalarType(type, entityType);
            if (!globalTypes.has(typescriptType)) {
                const globalImport = globalImports[typescriptType];
                if (!globalImport) {
                    throw new Error(`Scalar type not found for ${typescriptType}`);
                }

                extraImports[typescriptType] = globalImport;
            }
        }

        if (!typescriptType) {
            console.warn(`Type not found`, { field: fieldName, type: field.type.toString() });
            typescriptType = `unknown`;
        }

        let renderedType = overrideFields[typescriptType] ?? typescriptType;

        switch (foreignType) {
            case 'connection': {
                pgImportTypes.add('ConnectionField');
                renderedType = `ConnectionField<${renderedType}>`;
                break;
            }
            case 'link': {
                if (isArray) {
                    pgImportTypes.add('QueryableListField');
                    renderedType = `QueryableListField<${renderedType}>`;
                } else {
                    if (nullable) {
                        renderedType = `${renderedType} | null`;
                    }

                    if (entities.has(type as GraphQLObjectType)) {
                        pgImportTypes.add('ForeignField');
                        renderedType = `ForeignField<${renderedType}>`;
                    } else {
                        const insertType = getInsertOverride(typescriptType);
                        if (createField) {
                            const globalImport = globalImports[insertType];
                            if (globalImport) {
                                extraImports[insertType] = globalImport;
                            }
                        }

                        pgImportTypes.add('QueryableField');
                        renderedType = `QueryableField<${[
                            renderedType,
                            createField
                                ? requiredKeys.has(fieldName)
                                    ? insertType
                                    : [insertType, 'undefined'].join(' | ')
                                : 'never',
                        ]
                            .filter(Boolean)
                            .join(', ')}>`;
                    }
                }
                break;
            }

            default: {
                if (isArray) {
                    renderedType = `${renderedType}[]`;
                } else if (nullable) {
                    renderedType = `${renderedType} | null`;
                }

                pgImportTypes.add('Field');
                renderedType = `Field<${[
                    renderedType,
                    createField
                        ? requiredKeys.has(fieldName)
                            ? typescriptType
                            : [renderedType, 'undefined'].join(' | ')
                        : 'never',
                ]
                    .filter(Boolean)
                    .join(', ')}>`;
            }
        }

        mappedFields.push({ name: fieldName, foreignType, type: renderedType });
    }

    let content = dedent`
        /* eslint-disable */
        /**
         * This file was automatically generated and should not be edited.
         * If you want to make changes to the entity use migrations instead.
         */\n\n
    `;

    if (pgImportTypes.size > 0) {
        content += `import { ${[...pgImportTypes.values()]
            .sort((a, b) => a.localeCompare(b))
            .join(', ')} } from '${pgPackagePath}';\n`;
    }

    if (importEntities.size > 0) {
        content += `import type { ${[...importEntities.values()]
            .sort((a, b) => a.toString().localeCompare(b.toString()))
            .map((x) => x.toString())
            .join(', ')} } from '.';\n`;
    }

    const extraEntries = Object.entries(extraImports);
    if (extraEntries.length > 0) {
        const groups = groupBy(
            extraEntries,
            ([, path]) => path,
            ([type]) => type,
        );

        for (const [path, group] of Object.entries(groups)) {
            content += `import { ${group.sort((a, b) => a.localeCompare(b)).join(', ')} } from '${path}';\n`;
        }
    }

    content += `import { OverrideMap } from '../override';`;

    content += `\n\n`;
    content += `// prettier-ignore\n`;
    content += `export interface ${entityName} extends ApplyOverride<{\n`;

    const groups = Object.entries(
        groupBy(
            mappedFields,
            ({ foreignType, name }) => {
                if (pkFields?.map((x) => x.split(':')[0]).includes(name)) {
                    return 'a';
                }

                switch (name) {
                    case 'pk':
                        return 'b';
                    case 'createdAt':
                    case 'updatedAt':
                        return 'c';

                    default:
                        return `d-${foreignType}`;
                }
            },
            (x) => x,
        ),
    ).map(([, x]) => x);

    content += groups
        .map((group) =>
            group
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item) => `    ${item.name}: ${item.type};`)
                .join('\n'),
        )
        .join('\n\n');

    content += `\n}, OverrideMap['${entityName}']> { }\n`;
    if (createField) {
        const maybeSchema = schemaName !== 'public' ? `, { schema: '${schemaName}' }` : '';

        content += `\n`;
        content += `export const ${pluralize(entityName)} = new EntityAccessor<${entityName}>('${entityName}'${maybeSchema});`;
        content += `\n`;
    }

    return { content, importEntities };
};

const getPrimaryKeys = (schema: GraphQLSchema, entityNames: string[]) => {
    const fields = schema.getQueryType()?.getFields() ?? {};

    return Object.entries(fields)
        .filter(([name]) => entityNames.includes(name.toLocaleLowerCase()))
        .reduce<Record<string, Partial<Record<string, string>>>>((acc, [name, field]) => {
            acc[name.toLocaleLowerCase()] = reduceBy(
                field.args,
                ({ name }) => name,
                ({ type }) => {
                    if (isNonNullType(type)) {
                        type = type.ofType;
                    }

                    if (isListType(type)) {
                        type = type.ofType;
                    }

                    if (isScalarType(type)) {
                        return getScalarType(type);
                    }

                    throw new Error(`Unsupported type ${type}`);
                },
            );

            return acc;
        }, {});
};

const getRequiredFields = (schema: GraphQLSchema) => {
    const fields = schema.getMutationType()?.getFields() ?? {};

    return Object.entries(fields)
        .filter(([name]) => name.startsWith('create'))
        .reduce<Record<string, Set<string>>>((acc, [name, field]) => {
            const entityNameCamelCase = camelCase(name.replace('create', ''));

            let type: GraphQLType | undefined = field.args[0]?.type;
            if (isNonNullType(type)) {
                type = type.ofType;
            }

            if (!isInputObjectType(type)) {
                throw new Error(`Should be input object type ${type}`);
            }

            const entityInput = type.getFields()[entityNameCamelCase];
            if (!entityInput) {
                console.warn(`No input found for ${entityNameCamelCase}`);
                return acc;
            }

            type = entityInput.type;

            if (isNonNullType(type)) {
                type = type.ofType;
            }

            if (!isInputObjectType(type)) {
                throw new Error(`Should be input object type ${type}`);
            }

            acc[entityNameCamelCase.toLocaleLowerCase()] = new Set(
                Object.values(type.getFields())
                    .filter((x) => isNonNullType(x.type))
                    .map((x) => x.name),
            );

            return acc;
        }, {});
};

const globalTypes = new Set<string>(['string', 'boolean', 'number', 'Date']);

const getScalarType = (type: GraphQLScalarType, parent?: GraphQLObjectType) => {
    switch (type.name) {
        case 'ID':
        case 'UUID':
        case 'String':
        case 'BigInt':
            return 'string';
        case 'Float':
        case 'Int':
            return 'number';
        case 'GeoJSON': {
            switch (parent?.name) {
                case 'GeographyPolygon':
                case 'GeometryPolygon':
                    return 'Polygon';
                case 'GeographyPoint':
                case 'GeometryPoint':
                    return 'Point';
                case 'GeographyLineString':
                case 'GeometryLineString':
                    return 'LineString';
                case 'GeographyMultiPoint':
                case 'GeometryMultiPoint':
                    return 'MultiPoint';
                case 'GeographyMultiLineString':
                case 'GeometryMultiLineString':
                    return 'MultiLineString';
                case 'GeographyMultiPolygon':
                case 'GeometryMultiPolygon':
                    return 'MultiPolygon';
                case 'GeographyCollection':
                case 'GeometryCollection':
                    return 'GeographyCollection';
                default:
                    return 'GeoJSON';
            }
        }
        case 'JSON':
            return 'JsonValue';
        case 'Datetime':
            return 'Date';
        case 'Boolean':
            return 'boolean';
        case 'Decimal':
            return 'Big';
        case 'Date':
        case 'Time':
            return 'string';

        default:
            return 'unknown';
    }
};

const fileExists = (path: string) => {
    return fs
        .access(path, constants.R_OK)
        .then(() => true)
        .catch(() => false);
};

const getInsertOverride = (type: string) => {
    switch (type) {
        case 'GeographyPolygon':
        case 'GeometryPolygon':
            return 'Polygon';
        case 'GeometryPoint':
        case 'GeographyPoint':
            return 'Point';
        case 'GeometryLineString':
        case 'GeographyLineString':
            return 'LineString';
        case 'GeometryMultiPoint':
        case 'GeographyMultiPoint':
            return 'MultiPoint';
        case 'GeometryMultiLineString':
        case 'GeographyMultiLineString':
            return 'MultiLineString';
        case 'GeometryMultiPolygon':
        case 'GeographyMultiPolygon':
            return 'MultiPolygon';
        case 'GeometryCollection':
        case 'GeographyCollection':
            return 'GeographyCollection';
        default:
            return type;
    }
};
