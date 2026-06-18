import { neon } from "@neondatabase/serverless";
import type { SqlExecutor, SqlRow } from "./sql";

export function neonExecutor(connectionString: string): SqlExecutor {
  const sql = neon(connectionString);
  return async (text, params) => {
    const rows = await sql.query(text, [...params]);
    return rows as SqlRow[];
  };
}
