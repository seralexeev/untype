export const createConfig = (applicationName: string, config: Config) => {
    const { replicas = {}, ...master } = config;

    const readonly = Object.values(replicas)
        .filter((x) => x.enabled)
        .map(({ enabled: _, ...replica }) => ({
            ...master,
            ...Object.fromEntries(Object.entries(replica).filter(([_, value]) => value !== undefined)),
        }));

    return {
        applicationName,
        master,
        readonly,
    };
};

type NodeConfig = {
    host?: string;
    user?: string;
    password?: string;
    port?: number;
    database?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
};

type ReplicaConfig = NodeConfig & {
    enabled?: boolean;
};

type Config = NodeConfig & {
    replicas?: {
        '0'?: ReplicaConfig;
        '1'?: ReplicaConfig;
        '2'?: ReplicaConfig;
        '3'?: ReplicaConfig;
        '4'?: ReplicaConfig;
    };
};
