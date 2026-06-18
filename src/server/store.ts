import type { MatchStore } from "@/engine/match/store";
import { InMemoryMatchStore } from "@/engine/match/store";
import { neonExecutor } from "@/persistence/neon";
import { PostgresMatchStore } from "@/persistence/postgresMatchStore";
import { createMatchesTable } from "@/persistence/sql";

let cached: MatchStore | undefined;
let migrated = false;

export function getStore(): MatchStore {
  if (cached === undefined) {
    const url = process.env.DATABASE_URL;
    cached =
      url === undefined ? new InMemoryMatchStore() : new PostgresMatchStore(neonExecutor(url));
  }
  return cached;
}

export async function ensureMigrated(): Promise<void> {
  if (migrated) return;
  const url = process.env.DATABASE_URL;
  if (url !== undefined) await createMatchesTable(neonExecutor(url));
  migrated = true;
}
