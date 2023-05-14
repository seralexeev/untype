import { Transaction } from '@untype/pg';

export default async (t: Transaction) => {
    await t.sql`
        CREATE TABLE IF NOT EXISTS todos (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id uuid NOT NULL REFERENCES users(id),
            text text NOT NULL,
            status text NOT NULL,
            tags text[] NOT NULL DEFAULT '{}',

            created_at timestamp NOT NULL DEFAULT clock_timestamp(),
            updated_at timestamp NOT NULL DEFAULT clock_timestamp()
        )
    `;

    await t.sql`CREATE TRIGGER todos_updated_at BEFORE UPDATE ON todos FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at()`;

    await t.sql`CREATE INDEX todos_tags_idx ON todos USING GIN (tags)`;
    await t.sql`CREATE INDEX todos_user_id_idx ON todos (user_id)`;
    await t.sql`CREATE INDEX todos_text_idx ON todos USING GIN (text gin_trgm_ops)`;
};
