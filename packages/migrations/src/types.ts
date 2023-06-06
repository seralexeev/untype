import { Pg, Transaction } from '@untype/pg';

export type MigrationRow = { id: number; name: string; file_name: string; created_at: Date };
export type Migration = { id: number; name: string; apply: ApplyCallback };
export type ApplyCallback = (client: Transaction, options: ApplyOptions) => Promise<unknown>;
export type ApplyOptions = { pg: Pg };
export type MigrationList = Migration[];
