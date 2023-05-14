import { Transaction } from '@untype/pg';

export default async (t: Transaction) => {
    await t.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await t.sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`;
    await t.sql`
        CREATE OR REPLACE FUNCTION trigger_set_updated_at()
        RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = clock_timestamp();
                RETURN NEW;
            END;
        $$ LANGUAGE plpgsql
    `;
};
