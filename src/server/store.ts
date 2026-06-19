import type { MatchStore } from "@/engine/match/store";
import { InMemoryMatchStore } from "@/engine/match/store";
import { lazyMigration, type LazyMigration } from "@/persistence/migrate";
import { neonExecutor } from "@/persistence/neon";
import { PostgresMatchStore } from "@/persistence/postgresMatchStore";

let cached: MatchStore | undefined;
let lazy: LazyMigration | undefined;

function migrationFor(url: string): LazyMigration {
  lazy ??= lazyMigration(neonExecutor(url));
  return lazy;
}

export function getStore(): MatchStore {
  if (cached === undefined) {
    const url = process.env.DATABASE_URL;
    cached =
      url === undefined
        ? new InMemoryMatchStore()
        : new PostgresMatchStore(migrationFor(url).executor);
  }
  return cached;
}

export async function ensureMigrated(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url !== undefined) await migrationFor(url).migrate();
}
