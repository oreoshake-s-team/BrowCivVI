export type SqlRow = Record<string, unknown>;

export type SqlExecutor = (text: string, params: readonly unknown[]) => Promise<readonly SqlRow[]>;

export const MATCHES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS matches (
  id text PRIMARY KEY,
  owner text,
  version integer NOT NULL,
  schema_version integer NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

export async function createMatchesTable(exec: SqlExecutor): Promise<void> {
  await exec(MATCHES_TABLE_SQL, []);
}
