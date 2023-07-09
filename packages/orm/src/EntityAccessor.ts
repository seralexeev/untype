import { camelCase } from 'change-case';
import { pluralize } from 'graphile-build';
import { NotFoundError } from '@untype/core';
import { SqlClient, Transaction, isTransaction } from '@untype/pg';
import { Filter } from './filter';
import { GqlQueryBuilder } from './gql';
import { FieldSelector, SelectorShape } from './selector';
import { EntityShape, InferPrimaryKey, InsertShape, OrderBy, Query, UpdateShape } from './types';

export class EntityAccessor<T> {
    private queries;

    public get schemaName() {
        return this.options?.schema ?? 'public';
    }

    public constructor(public name: string, private options?: { schema?: string }) {
        const camelCaseName = camelCase(name);
        this.queries = {
            pluralCamelCaseName: pluralize(camelCaseName),
            camelCaseName,
            create: `create${name}`,
            update: `update${name}`,
            delete: `delete${name}`,
            upsert: `upsert${name}`,
        };
    }

    // TODO: merge selectors into one object
    public createSelector = <S extends FieldSelector<T, S>>(selector: S) => selector;

    public find = <S extends FieldSelector<T, S>>(t: SqlClient, query: Query<T> & { selector: S }) => {
        return this.query<Array<SelectorShape<T, S>>>(t, 'query', this.queries.pluralCamelCaseName, query ?? {});
    };

    public findByPk = async <S extends FieldSelector<T, S>>(t: SqlClient, query: { pk: InferPrimaryKey<T>; selector: S }) => {
        const { pk, selector } = query;

        return this.query<SelectorShape<T, S> | null>(t, 'query', this.queries.camelCaseName, {
            ...pk,
            selector,
        });
    };

    public findByPkOrError = async <S extends FieldSelector<T, S>>(
        t: SqlClient,
        query: { pk: InferPrimaryKey<T>; selector: S },
    ) => {
        const data = await this.findByPk(t, query);
        if (!data) {
            throw new NotFoundError(`${this.name} not found`, {
                data: { pk: query.pk },
            });
        }

        return data;
    };

    public findFirst = async <S extends FieldSelector<T, S>>(
        t: SqlClient,
        query: { selector: S; filter?: Filter<T>; orderBy?: OrderBy<T> },
    ) => {
        const [row] = await this.find(t, { ...query, first: 1 });

        return row ?? null;
    };

    public findFirstOrError = async <S extends FieldSelector<T, S>>(
        t: SqlClient,
        query: { selector: S; filter?: Filter<T>; orderBy?: OrderBy<T> },
    ) => {
        const data = await this.findFirst(t, query);
        if (!data) {
            throw new NotFoundError(`${this.name} not found`, {
                data: { filter: query.filter },
            });
        }

        return data;
    };

    public findOrCreate = async <S extends FieldSelector<T, S>>(
        t: SqlClient,
        query: { selector: S; filter: Filter<T>; item: InsertShape<T> },
    ) => {
        const { filter, item, selector } = query;
        const row = await this.findFirst(t, { filter, selector });
        if (!row) {
            return this.create(t, { item, selector });
        }

        return row;
    };

    public count = async <S extends FieldSelector<T, S>>(t: SqlClient, query?: { filter?: Filter<T> }) => {
        const data = await this.query<{ totalCount: number }>(t, 'query', `${this.queries.pluralCamelCaseName}Connection`, {
            ...query,
            selector: { totalCount: true },
        });

        return data.totalCount;
    };

    public findAndCount = async <S extends FieldSelector<T, S>>(t: SqlClient, query: Query<T> & { selector: S }) => {
        const data = await this.query<{ totalCount: number; nodes: Array<SelectorShape<T, S>> }>(
            t,
            'query',
            `${this.queries.pluralCamelCaseName}Connection`,
            {
                ...query,
                selector: {
                    totalCount: true,
                    nodes: query.selector,
                },
            },
        );

        return { total: data.totalCount, items: data.nodes };
    };

    public exists = <S extends FieldSelector<T, S>>(t: SqlClient, query?: { filter?: Filter<T> }) => {
        return this.count(t, query).then((x) => x > 0);
    };

    public existsByPk = <S extends FieldSelector<T, S>>(t: SqlClient, { pk }: { pk: InferPrimaryKey<T> }) => {
        return this.findByPk(t, { pk, selector: {} }).then(Boolean);
    };

    public create = async <S extends FieldSelector<T, S> = []>(
        t: SqlClient,
        query: { item: InsertShape<T>; selector?: S },
    ): Promise<SelectorShape<T, S>> => {
        const { selector, item } = query;

        const data = await this.query(t, 'mutation', this.queries.create, {
            input: { [this.queries.camelCaseName]: item },
            selector: { [this.queries.camelCaseName]: selector },
        });

        return data?.[this.queries.camelCaseName] ?? {};
    };

    public update = async <S extends FieldSelector<T, S> = []>(
        t: SqlClient,
        query: { pk: InferPrimaryKey<T>; patch: UpdateShape<T>; selector?: S },
    ): Promise<SelectorShape<T, S>> => {
        const { selector, patch, pk } = query;

        const data = await this.query(t, 'mutation', this.queries.update, {
            input: { ...pk, patch },
            selector: { [this.queries.camelCaseName]: selector },
        });

        return data?.[this.queries.camelCaseName] ?? {};
    };

    public delete = async <S extends FieldSelector<T, S> = []>(
        t: SqlClient,
        query: { pk: InferPrimaryKey<T>; selector?: S },
    ): Promise<SelectorShape<T, S>> => {
        const { selector, pk } = query;

        const data = await this.query(t, 'mutation', this.queries.delete, {
            input: pk,
            selector: { [this.queries.camelCaseName]: selector },
        });

        return data?.[this.queries.camelCaseName] ?? {};
    };

    public upsert = async <S extends FieldSelector<T, S> = []>(
        t: SqlClient,
        query: { where?: Partial<EntityShape<T>>; item: InsertShape<T>; selector?: S },
    ): Promise<SelectorShape<T, S>> => {
        const { selector, where, item } = query;

        const data = await this.query(t, 'mutation', this.queries.upsert, {
            input: { [this.queries.camelCaseName]: item },
            where,
            selector: { [this.queries.camelCaseName]: selector },
        });

        return data?.[this.queries.camelCaseName] ?? {};
    };

    public upsertList = async <TItem>(
        t: Transaction,
        args: {
            items: TItem[];
            existing: Array<InferPrimaryKey<T>>;
            where: (item: TItem) => Partial<EntityShape<T>>;
            item: (item: TItem) => InsertShape<T>;
            compare:
                | ((item: TItem, existing: InferPrimaryKey<T>) => boolean)
                | (keyof TItem & keyof InferPrimaryKey<T>)
                | Array<keyof TItem & keyof InferPrimaryKey<T>>;
        },
    ) => {
        let existing = [...args.existing];
        const { compare } = args;
        const finalCompare =
            typeof compare === 'function'
                ? compare
                : Array.isArray(compare)
                ? (item: TItem, existing: InferPrimaryKey<T>) => compare.every((x) => item[x] === existing[x])
                : (item: TItem, existing: InferPrimaryKey<T>) => item[compare] === existing[compare];

        for (const item of args.items) {
            await this.upsert(t, {
                where: args.where(item),
                item: args.item(item),
            });

            existing = existing.filter((x) => !finalCompare(item, x));
        }

        for (const pk of existing) {
            await this.delete(t, { pk });
        }
    };

    public async updateOrCreate<S extends FieldSelector<T, S> = []>(
        t: SqlClient,
        args: {
            pk: InferPrimaryKey<T>;
            selector?: S;
            item: Omit<InsertShape<T>, keyof InferPrimaryKey<T>>;
            patch?: UpdateShape<T>;
        },
    ): Promise<[slice: SelectorShape<T, S>, created: boolean]> {
        const { patch, pk, selector, item } = args;

        const res = await this.existsByPk(t, { pk });

        return res
            ? [await this.update(t, { pk, patch: (patch ?? item) as any, selector }), false]
            : [await this.create(t, { item: { ...item, ...pk } as any, selector }), true];
    }

    private query = async <T = any>(
        client: SqlClient,
        operation: 'query' | 'mutation',
        name: string,
        query: object,
    ): Promise<T> => {
        const runQuery = this.getQueryRunner(client);

        if (isTransaction(client) || operation === 'query') {
            return client.connect<T>((client) => runQuery(client, operation, name, query));
        }

        // mutations in postgraphile always run in a transaction
        return client.transaction(({ connect }) => connect((client) => runQuery(client, operation, name, query)));
    };

    private getQueryRunner = ({ pg }: SqlClient) => {
        if (!pg.meta.gqlQueryBuilderCollection) {
            pg.meta.gqlQueryBuilderCollection = {};
        }

        const gqlQueryBuilderCollection = pg.meta.gqlQueryBuilderCollection as Record<string, GqlQueryBuilder>;

        let queryBuilder = gqlQueryBuilderCollection[this.schemaName];
        if (!queryBuilder) {
            queryBuilder = new GqlQueryBuilder(pg.pool, this.schemaName);
            gqlQueryBuilderCollection[this.schemaName] = queryBuilder;
        }

        return queryBuilder.query;
    };
}
