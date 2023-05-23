# 🐘 untype/orm

This library is a wrapper around `PostGraphile`, facilitating an ORM-based approach for database management. It allows for efficient and type-safe operations on a relational database, treating it as an arbitrarily nested graph of objects. The library extensively employs [@untype/pg](../pg) for database communication.

> PostGraphile empowers you with the full strength of `PostgreSQL` through an exquisitely designed, extendable, customizable, and highly efficient GraphQL server.

> It intuitively identifies tables, columns, indexes, relationships, views, types, functions, comments, and more, providing a GraphQL server that is remarkably intelligent about your data. Additionally, it updates itself automatically, without a need for restarting, when you alter your database schema.

## 💡 Motivation

The conventional approach while working with `PostGraphile` involves the initiation of a separate GraphQL server. This server connects to the database and exposes a GraphQL API for data manipulation. This API can be utilized as a service within an infrastructure, or it can be made public, safeguarding data with an inbuilt authorization system and [Row Level Security](https://www.graphile.org/postgraphile/security/). Although this arrangement works perfectly fine, it has some limitations:

-   A separate GraphQL server requires maintenance
-   Connecting to another server results in latency
-   Writing gql queries and generating codes for them is necessary
-   Implementing transactions can be challenging
-   Sometimes, correctly and efficiently implementing RLS is difficult
-   Occasionally, direct SQL queries to the database are necessary without using GraphQL

PostGraphile allows you to utilize the GraphQL schema directly within the NodeJS process, which addresses the first two problems. However, the remaining issues persist. Consequently, we decided to create a library that allows the use of PostGraphile as an ORM for NodeJS applications.

## Installation

```bash
# npm
npm install @untype/orm

# yarn
yarn add @untype/orm

# pnpm
pnpm add @untype/orm
```

## Example

The library acts as a wrapper around `PostGraphile` and exposes a set of classes and types for describing entities. All of them are located in the `@untype/orm` module. To work with the ORM, we first need to define the schema of our entity.

For instance, suppose we want to create a simple ToDo list application with the following schema:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.updated_at = clock_timestamp();
        RETURN NEW;
    END;
$$;

CREATE TABLE public.todos (
    id uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid REFERENCES users(id) NOT NULL,
    text text NOT NULL,
    status text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL,
    updated_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TRIGGER todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT public.uuid_generate_v4() NOT NULL,
    email text UNIQUE NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    created_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL,
    updated_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
```

## Entities

The schema contains two tables, `todos` and `users`, linked through the foreign key `user_id`. Firstly, we need to describe these entities in ORM terms:

```typescript
import { ConnectionField, EntityAccessor, Field, PrimaryKey, QueryableListField } from '@untype/orm';

type Todo = {
    pk: PrimaryKey<{ id: string }>;

    id: Field<string, string | undefined>;
    cover: Field<string | null, string | null | undefined>;
    status: Field<string, string>;
    tags: Field<string[], string[] | undefined>;
    text: Field<string, string>;
    userId: Field<string, string>;
    createdAt: Field<Date, Date | undefined>;
    updatedAt: Field<Date, Date | undefined>;

    user: ForeignField<User>;
};

type User = {
    pk: PrimaryKey<{ id: string }>;

    id: Field<string, string | undefined>;
    email: Field<string, string>;
    firstName: Field<string, string>;
    lastName: Field<string, string>;
    createdAt: Field<Date, Date | undefined>;
    updatedAt: Field<Date, Date | undefined>;

    todosConnection: ConnectionField<Todo>;
    todos: QueryableListField<Todo>;
};
```

All fields use `camelCase` notation and replicate the type description in the `PostGraphile` GraphQL schema with some additions.

-   `PrimaryKey` - describes the entity's primary key. In our case, it's a single field `id` with a `text` type. You can also use a composite key, for instance, `PrimaryKey<{ id: string, userId: string }>`
-   `Field<TSelect, TCreate>` - describes the entity's columns. The first generic argument defines the type we obtain when we read data from the database, and the second one defines the type we pass when creating a new entity. In our case, we want the `id` to be optional when creating a new entity, hence we specified `string | undefined`. We also want `tags` to be optional when reading from the database, hence we stated `string[] | undefined`. All other fields cannot be `undefined` when reading from the database and when creating a new entity.
-   `ForeignField<T>` - describes a foreign key. In our case, this is the `user` field referring to the `User` entity. It can also be `nullable` if the database field `user_id` can be `null`.
-   `ConnectionField<T>` - describes a field that returns a list of entities. More details can be found [here](https://www.graphile.org/postgraphile/connections/).
-   `QueryableListField<T>` - describes a field that returns a list of entities with filtering, as well as limit and offset.

## EntityAccessor

Once we have described the entities, we need to create an `EntityAccessor` that will be used for accessing these entities:

```typescript
import { EntityAccessor } from '@untype/orm';

const Todos = new EntityAccessor<Todo>('Todo');
const Users = new EntityAccessor<User>('User');
```

The `EntityAccessor` object is stateless, doesn't require resources like database connections, and can be created once and used throughout the entire application. The first argument of the `EntityAccessor` constructor is the entity name in the `PostGraphile` GraphQL schema. You can also specify the schema name as the second argument, with `public` being the default.

The class object contains the following methods:

-   `createSelector` - for creating a field selector for the entity
-   `find` - for searching an entity by a condition
-   `findByPk` - for searching an entity by a primary key
-   `findByPkOrError` - for searching an entity by a primary key or throwing an error if the entity is not found
-   `findFirst` - for finding the first entity by a condition
-   `findFirstOrError` - for finding the first entity by a condition or throwing an error if the entity is not found
-   `findOrCreate` - for searching an entity by a condition or creating a new entity if the entity is not found
-   `count` - for counting the number of entities by a condition
-   `findAndCount` - for searching entities by a condition and counting the number of entities
-   `exists` - for checking the existence of an entity by a condition
-   `existsByPk` - for checking the existence of an entity by a primary key
-   `create` - for creating a new entity
-   `update` - for updating an entity by a primary key
-   `delete` - for deleting an entity by a primary key
-   `upsert` - for creating or updating an entity by a primary key

These methods, in conjunction with the entity description, allow type-safe and efficient work with `PostGraphile` without the need to generate code for each query that can have different sets of filters and fields. For example:

```typescript
const users = await Todos.findAndCount(pg, {
    filter: {
        text: { includesInsensitive: input.search },
        userId: { equalTo: ctx.auth.id },
    },
    selector: {
        id: true,
        text: true,
        tags: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: ['id', 'firstName', 'lastName'],
    },
});
```

## Selectors

Selectors are objects that describe which fields we want to fetch from the database. Selectors can be created using the `createSelector` method or passed directly into the `find`, `findFirst`, `findAndCount`, etc. methods. There are two types of selectors:

-   **Array-like** - allows you to describe which fields you want to fetch from the database in the form of an array of string literals. Convenient if we do not want to delve into the entity hierarchy and want to get only root fields. For example, `['id', 'title', 'status']`. They are more compact than `object-like` selectors.
-   **Object-like** - allows you to describe which fields you want to fetch from the database in the form of an object. Convenient if we want to fetch fields of nested entities. For example, `{ id: true, text: true, status: true, user: { id: true, firstName: true } }`.

Selectors can be combined with each other. For example:

```json
{
    "id": true,
    "text": true,
    "status": true,
    "user": ["id", "firstName"]
}
```

Selectors can be reused for queries, you need to use `createSelector`:

```typescript
const selector = Todos.createSelector({
    id: true,
    text: true,
    status: true,
    user: ['id', 'firstName'],
});
```

Selectors play a crucial role in application development and how we write code. Thanks to the power of the TypeScript type system and the implementation of `PostGraphile`, we can choose only the necessary slice of the object graph for each specific case and not worry about getting extra data from the database or getting an incorrect description of the entity type, as is the case with classic ORMs for TypeScript. Consider an example:

```typescript
const users = await Users.find(pg, {
    selector: ['id'],
});
```

In this example, the type of `users` will be:

```typescript
type Users = Array<{ id: string }>;
```

If we add more fields, TypeScript will infer the correct type for them as well:

```typescript
const users = await Users.find(pg, {
    selector: ['id', 'firstName', 'lastName'],
});

type Users = Array<{ id: string; firstName: string; lastName: string }>;
```

Furthermore, if we add nested fields, TypeScript will infer the correct type for them as well. But for this, we need to switch to `object-like` selectors:

```typescript
const users = await Users.find(pg, {
    selector: {
        id: true,
        firstName: true,
        lastName: true,
        todos: {
            id: true,
            text: true,
            status: true,
        },
    },
});

type Users = Array<{
    id: string;
    firstName: string;
    lastName: string;
    todos: Array<{
        id: string;
        text: string;
        status: string;
    }>;
}>;
```

_Please note that using nested selectors results in the addition of join operations in the query, which can significantly affect performance. Try to analyze the queries and consider the possibility of adding indexes or writing raw queries manually for particularly critical pieces of your application_

As you can see, we received the correct type for the nested `todos` fields. The library understands that `todos` is not just an object, but an array of objects, and therefore returns the `Array<...>` type. The type inference system is able to determine types for arrays, objects, scalar fields, nullable fields. This is an incredibly powerful mechanism that simplifies the lives of developers and allows, along with [`@untype/rpc`](./rpc/README.md) to build end to end typesafe applications from the db to the frontend.

## Filters

Filtering is implemented using the PostGraphile plugin [postgraphile-plugin-connection-filter](https://github.com/graphile-contrib/postgraphile-plugin-connection-filter) with the addition of corresponding typings.

In general, a filter is described as:

```typescript
// prettier-ignore
export type Filter<T> =
    | {
          [P in keyof T]?
              : T[P] extends ForeignField<infer Q>       ? Filter<Q>
              : T[P] extends QueryableListField<infer Q> ? QueryableListFilter<Q>
              : T[P] extends Field<infer Q>
                  ? [Q] extends [string | null]    ? Scalar<Q>   | StringFilter
                  : [Q] extends [JsonValue | null] ? JsonFilter  | Scalar<Q>
                  : [Q] extends [Array<infer A>]   ? Scalar<T[]> | ArrayFilter<A>
                  : Scalar<Q>
              : never;
      }
    | { or: Array<Filter<T>> }
    | { and: Array<Filter<T>> }
    | { not: Filter<T> };
```

As you can see, the filter can work with both scalar types and filters for nested entities. Keep in mind that filtering (especially for nested entities) without appropriate indexes can lead to poor query performance, so always analyze queries for heavily loaded parts of your application. If necessary, consider creating indexes.

## Creating Entities

The `create` method is used to create entities. It takes an object as an argument with the fields we want to create. The library understands from the entity description which fields should be mandatory and which ones are not. For example, if we try to create a `User` entity without a `firstName` field, we will get a compilation error:

```typescript
const { id } = await Users.create(pg, {
    item: {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
    },
    selector: ['id'],
});
```

You can also specify a selector to retrieve data after creating an entity. In this case, we only get the `id` of the created entity.

## Updating Entities

The `update` method is used to update entities. The library also generates types for the fields to be updated and understands which fields are mandatory and which ones are not.

```typescript
const { firstName } = await Users.update(pg, {
    pk: { id: '1' },
    patch: {
        firstName: 'Anna',
    },
    selector: ['firstName'],
});
```

In this case, we updated the `firstName` field of the `User` entity from `Alice` to `Anna`. We also specified a selector to retrieve data after the update. In this case, we only get the `firstName` of the updated entity.

The method takes a pk - the primary key of the entity.

_The library does not support updating entities by a filter, which is not always convenient. As a temporary solution, you can use the `find` method to get the entity's pk and then use it for updating._

## Deleting Entities

The `delete` method is used to delete entities. The method takes a pk - the primary key of the entity.

```typescript
await Users.delete(pg, {
    pk: { id: '1' },
});
```

_The library does not support deleting entities by a filter, which is not always convenient. As a temporary solution, you can use the `find` method to get the entity's pk and then use it for deletion._

## Sorting

Some `EntityAccessor` methods take an `orderBy` argument for sorting entities. For convenience, the library provides the `OrderBy<T>` type that allows specifying the sorting fields and the sorting direction.

```typescript
const users = await Users.find(pg, {
    selector: ['firstName', 'lastName'],
    orderBy: [
        ['firstName', 'ASC'],
        ['lastName', 'DESC'],
    ],
});
```

The type is a tuple of two elements. The first element is the field by which the sorting is done, the second is the direction of sorting. Possible sorting direction values:

-   `ASC` - ascending
-   `DESC` - descending

## Additional Types

Sometimes there is a need to get the type of an entity slice by selector without executing a query, for instance, to specify it in a method signature. Or to specify an entity filter as a function argument. For this, the library provides several useful types:

-   `InsertShape<T>` - Describes fields for entity creation
-   `UpdateShape<T>` - Describes fields for entity update
-   `EntityShape<T>` - Describes entity fields
-   `OrderBy<T>` - Describes fields for sorting
-   `Filter<T>` - Describes fields for sorting
-   `SelectorShape<T, S>` - Outputs an entity slice by selector

For example:

```typescript
const selector = Users.createSelector({
    id: true,
    firstName: true,
    lastName: true,
    todos: {
        id: true,
        text: true,
        status: true,
    },
});

type UserSlice = SelectorShape<User, typeof selector>;

type UserSlice = {
    id: string;
    firstName: string;
    lastName: string;
    todos: Array<{
        id: string;
        text: string;
        status: string;
    }>;
};
```

## Transaction Support

Nearly all `EntityAccessor` methods take a `pg` - a `Pg` instance from the `@untype/pg` library - as an argument. This allows using the same interface for the ORM to work with transactions and raw queries. For example:

```typescript
const users = pg.transaction((t) => {
    const ids = t.sql<{ id: string }>`
        SELECT id
        FROM users AS u
        WHERE u.first_name %> ${input.query}
    `.then((x) => x.map((x) => x.id));

    return Users.find(t, {
        selector: ['id', 'firstName', 'lastName'],
        filter: { id: { in: ids } },
    });
});
```

This approach allows using ORM in all possible cases and switch painlessly to raw SQL queries if necessary.

## Entity Generator

Manual entity description might work for very small projects, but if you're creating a production-ready application, it's better to use an automatic entity generator. This generator connects to the database, retrieves the PostGraphile data schema, and generates entities based on it. For this, you need to install the `@untype/cli` package, which provides the `untype orm generate` command.

```bash
yarn add @untype/cli
```

Then it's recommended to add the command to `package.json`:

```json
{
    "scripts": {
        "generate": "untype orm generate src/entities -n untype -p 5434"
    }
}
```

The command arguments should specify the directory in the project where the entities will be stored and the database connection parameters. After that, you can run the command `yarn generate`, and the entities will be generated in the specified directory.

```
├── generated
│   ├── Todo.ts
│   ├── User.ts
│   └── index.ts
├── index.ts
└── override.ts
```

By default, entities will be generated in the `generated` directory. An `index.ts` file will be created in this directory, exporting all entities. An `override.ts` file will also be created, which can be used for field overrides. This is very convenient when the schema cannot describe all the details of your business logic. For example, when we want to use an `enum` for the `status` field in the `Todo` entity:

```typescript
// modules/todo/models
export const todoStatuses = ['CREATED', 'COMPLETED', 'CANCELLED'] as const;
export const TodoStatusSchema = z.enum(todoStatuses);
export type TodoStatus = z.infer<typeof TodoStatusSchema>;

// override.ts
import { Field } from '@untype/orm';
import { TodoStatus } from '../modules/todo/models';
import { FieldsOverride } from './generated';

export type OverrideMap = FieldsOverride<{
    Todo: {
        status: Field<TodoStatus, TodoStatus>;
    };
}>;
```

In this file, we override the `status` field in the `Todo` entity and specify that it should be of `TodoStatus` type instead of `string`. This approach avoids casting in each place of use and it also penetrates all selectors and filters.

## Internal Implementation

The ORM implementation is based on two main parts:

-   TypeScript types that repeat the behavior of PostGraphile and allow outputting query results from selectors.
-   A runtime GraphQL query document generator from the selector.

At the code-writing stage, recursive types and the compiler, based on the entity description, allow writing correct code using type checking and autocomplete. Knowing the types of entities, the compiler outputs the results, finding a correspondence between the selector key and the entity description. The type does this recursively, key by key, processing nullable types, collections, and field overrides.

Since there is no information about types and entities at runtime, the query builder traverses the selector tree and matches it with the GraphQL schema provided by PostGraphile. For each selector key, it picks the right type, filters, limits, and other arguments are taken out into query arguments and it builds a GraphQL query document. Then it sends the query to the server and receives the result. Since it is assumed that the entity descriptions are up-to-date, you can simply return the query result, which will correspond one-to-one with the selector type output by the compiler.

The code generator does something similar, but in the reverse order. Using the GraphQL schema, it generates TypeScript entity descriptions.
