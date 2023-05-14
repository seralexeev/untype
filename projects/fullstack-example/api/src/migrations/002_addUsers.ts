import { Transaction } from '@untype/pg';

export default async (t: Transaction) => {
    await t.sql`
        CREATE TABLE IF NOT EXISTS users (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            email text NOT NULL UNIQUE,
            first_name text NOT NULL,
            last_name text NOT NULL,
            created_at timestamp NOT NULL DEFAULT clock_timestamp(),
            updated_at timestamp NOT NULL DEFAULT clock_timestamp()
        )
    `;

    await t.sql`CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at()`;
};
