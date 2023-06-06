import { LoggerType } from '@untype/core';
import { Pg, Transaction, raw } from '@untype/pg';
import { Migration, MigrationRow } from './types';

const PG_MIGRATE_LOCK_ID = 27031991;

const formatMigration = (migration: { id: number; name: string }): string => `Migration(${migration.id}, ${migration.name})`;

export class MigrationRunner {
    public constructor(private logger: LoggerType, private pg: Pg) {}

    public get migrationsTableName() {
        return 'migrations';
    }

    /**
     * Run all migrations that are not yet applied to the database.
     */
    public run = async (migrations: Migration[]) => {
        await this.pg.transaction(async (t) => {
            try {
                await this.acquireLock(t);
                await this.ensureMigrationTable();

                const allMigrations = [...migrations].sort((a, b) => a.id - b.id);
                if (allMigrations.length === 0) {
                    this.logger.info('No migrations');
                    return;
                }

                for (let i = 0; i < allMigrations.length - 1; i++) {
                    const migration = allMigrations[i];
                    if (migration && migration.id + 1 !== allMigrations[i + 1]?.id) {
                        throw new Error('Migration ids are not monotonically increasing');
                    }
                }

                this.logger.info('Migration list:', allMigrations);

                const appliedMigrations = await this.getAppliedMigrations(t);
                if (appliedMigrations.length > 0) {
                    this.logger.info('Applied migrations:', appliedMigrations);
                } else {
                    this.logger.info('No migrations have been applied');
                }

                for (let i = 0; i < appliedMigrations.length; i++) {
                    const appliedMigration = appliedMigrations[i];
                    const migration = allMigrations[i];
                    if (!appliedMigration) {
                        throw new Error('Unexpected undefined in applied migrations');
                    }
                    if (!migration) {
                        throw new Error(`Applied migration ${formatMigration(appliedMigration)} missing from source`);
                    }
                    if (appliedMigration.id !== migration.id) {
                        throw new Error(
                            `Migration #${i} expected to be ${formatMigration(appliedMigration)}, got ${formatMigration(
                                migration,
                            )}`,
                        );
                    }
                    if (appliedMigration.name !== migration.name) {
                        throw new Error(
                            `Migration #${i} name changed, got ${formatMigration(migration)}, expected ${formatMigration(
                                appliedMigration,
                            )}`,
                        );
                    }
                }

                let pendingMigrations = allMigrations;
                const lastAppliedMigration = appliedMigrations.at(-1);
                if (lastAppliedMigration) {
                    const lastAppliedMigrationIndex = allMigrations.findIndex((x) => x.id === lastAppliedMigration.id);
                    if (lastAppliedMigrationIndex === -1) {
                        throw new Error('Last applied migration is not in the migration list');
                    }

                    pendingMigrations = allMigrations.slice(lastAppliedMigrationIndex + 1);
                }

                if (pendingMigrations.length === 0) {
                    this.logger.info('No migrations have been applied');
                    return;
                }

                this.logger.info('Pending migrations:', pendingMigrations);
                await this.applyMigrations(pendingMigrations);

                this.logger.info('✅ Successfully ran migrations');
            } catch (error) {
                this.logger.error('Migration failed', error);

                throw error;
            }
        });
    };

    /**
     * Apply migrations each in a separate transaction to apply as much as possible
     */
    private applyMigrations = async (migrations: Migration[]) => {
        for (const migration of migrations) {
            await this.pg.transaction(async (t) => {
                const formattedMigrationId = migration.id.toString().padStart(3, '0');
                const migrationName = `[${formattedMigrationId}]: ${migration.name} (${formattedMigrationId}_${migration.name})`;

                try {
                    this.logger.info(`Applying migration ${migrationName}`);
                    await migration.apply(t, { pg: this.pg });
                    await t.sql`INSERT INTO "${raw(this.migrationsTableName)}" ("id", "name") VALUES (${migration.id}, ${
                        migration.name
                    })`;
                } catch (error) {
                    this.logger.error(`Unable to apply migration ${migrationName}`, error);
                    throw error;
                }
            });
        }
    };

    public getAppliedMigrations = (t?: Transaction) => {
        return (t ?? this.pg).sql<MigrationRow>`SELECT * FROM "${raw(this.migrationsTableName)}" ORDER BY "id" ASC`;
    };

    private ensureMigrationTable = async () => {
        const [{ exists } = { exists: false }] = await this.pg.sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT FROM "information_schema"."tables" 
                WHERE "table_schema" = 'public'
                AND "table_name" = ${this.migrationsTableName}
            )
        `;

        if (exists) {
            this.logger.info('Migration table exists, skipping creation');
            return;
        }

        this.logger.info('Migration table does not exist, creating it');
        await this.pg.sql`
            CREATE TABLE IF NOT EXISTS "${raw(this.migrationsTableName)}" (
                "id" int PRIMARY KEY,
                "name" text NOT NULL,
                "created_at" timestamptz NOT NULL DEFAULT clock_timestamp()
            )
        `;
    };

    /**
     * Acquire lock to prevent multiple instances of the app from running migrations at the same time
     */
    private acquireLock = async (t: Transaction) => {
        type Row = { lockObtained: boolean };

        const [{ lockObtained } = { lockObtained: false }] =
            await t.sql<Row>`SELECT pg_try_advisory_xact_lock(${PG_MIGRATE_LOCK_ID}) as "lockObtained"`;

        if (!lockObtained) {
            this.logger.error('Failed to acquire lock');
            throw new Error('Could not obtain lock, another migration is running');
        }

        this.logger.info('Lock acquired');
        return lockObtained;
    };
}
