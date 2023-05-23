# 📖 untype/config

This library is designed to load and validate application configurations from various sources.

## 💡 Motivation

API service configuration is a task that often does not get the attention it deserves. As a result, we encounter incidents caused by improper configuration, which can lead to serious consequences. The typical approach to configuration involves the use of environment variables. However, this method does not provide validation of the configuration and doesn't allow its use in other formats, such as in tests. While locally this is a convenient way to manage configurations and secrets, in production we often use different configuration sources, for example, [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html). This library was created to address these issues.

## Installation

```bash
# npm
npm install @untype/config

# yarn
yarn add @untype/config

# pnpm
pnpm add @untype/config
```

## Usage

To start working with the config, you need to describe its structure and data types. This is accomplished using the [zod](https://github.com/colinhacks/zod) library. I recommend the following file structure for configuration:

```bash
├── config
│   ├── default.ts
│   ├── env
│   │   ├── dev.ts
│   │   ├── local.ts
│   │   └── prod.ts
│   └── index.ts
```

The `config` directory contains two files, `default.ts` and `index.ts`, as well as the `env` directory. The idea is to describe the config as a nested object where key values are `zod` schema. This allows for convenient support of configuration:

```typescript
// default.ts

import { ConfigShape } from '@untype/config';
import z from 'zod';

export const { shape, define } = new ConfigShape({
    env: z.enum(['dev', 'prod', 'local']),
    server: {
        port: z.number().default(3000),
        includeErrorsResponse: z.boolean().default(false),
    },
    logger: {
        pretty: z.enum(['none', 'json', 'yaml']).default('none'),
        level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    },
    auth: {
        google: {
            clientId: z.string(),
            clientSecret: z.string(),
        },
    },
    pg: {
        user: z.string().default('untype'),
        password: z.string().default('untype'),
        database: z.string().default('untype'),
        host: z.string().default('localhost'),
        port: z.number().default(5434),
    },
});
```

`ConfigShape` returns an instance of a class with two fields `shape` and `define`.

-   `shape` - is a `zod` schema that describes the structure of the config, necessary for its further loading.
-   `define` - is a config-typed function that allows you to redefine the config for any environment.

The next step is to redefine the configuration for each environment, if necessary:

```typescript
// env/dev.ts

import { define } from '../default';

export const dev = define({
    pg: {
        host: 'db-prod.com',
        port: 36726,
    },
});
```

```typescript
// env/prod.ts
import { define } from '../default';

export const prod = define({
    pg: {
        host: 'db-prod.com',
        port: 36726,
    },
});
```

```typescript
// env/local.ts
import { define } from '../default';

export const local = define({
    server: {
        includeErrorsResponse: true,
    },
    pg: {
        port: 5432,
    },
});
```

Next, you need to configure the configuration loader:

```typescript
// index.ts
import { EnvLoader, FileLoader, createConfig } from '@untype/config';
import { shape } from './default';
import { dev } from './env/dev';
import { local } from './env/local';
import { prod } from './env/prod';

export class Config extends createConfig(shape, [
    new FileLoader(process.env.UNTYPE_EXAMPLE__env, { dev, local, prod }),
    new EnvLoader('UNTYPE_EXAMPLE__', process.env),
]) {}
```

`loaders` is an array of loaders, instances of `ConfigLoader` subclasses

, in priority order. First, the loader loads the default configuration, and sequentially overwrites it with values from other loaders. In this case, if the environment variable `UNTYPE_EXAMPLE__env` has the value `local`, the configuration will be loaded from the file `env/local.ts`. Next, environment variables with the prefix `UNTYPE_EXAMPLE__` are used to override the configuration. This allows you to describe as many configurations as possible in a type-safe manner, including for each environment. At the same time, it leaves the ability to override the configuration through environment variables and restart the server to apply changes at any time.

`Config` has a static method `load: Promise<Config>` that allows loading the config. The `Config` class is an object that can be used with DI containers.

```typescript
container.register(Config, {
    useValue: await Config.load(),
});

class Service {
    constructor(private config: Config) {}

    public doSomething() {
        console.log(this.config.server.port);
    }
}

container.resolve(Service).doSomething();
```

In this code example, the `Config` class is registered in the dependency injection (DI) container, and can then be used within other classes and services. An instance of a `Service` class is created, which uses the `Config` instance for its operations. The `Service` class has a method `doSomething()` that uses the `port` property of the `server` configuration.
