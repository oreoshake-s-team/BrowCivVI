import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import type { MatchStore } from "@/engine/match/store";
import { InMemoryMatchStore } from "@/engine/match/store";
import { PrismaMatchStore } from "@/persistence/prismaMatchStore";

const globalForStore = globalThis as typeof globalThis & {
  __browCivViMatchStore?: MatchStore;
};

export function selectDatabaseUrl(env: Record<string, string | undefined>): string | undefined {
  const keys =
    env.VERCEL_ENV === "preview"
      ? ["SHARED_PREVIEW_DATABASE_URL", "DATABASE_URL"]
      : ["DATABASE_URL"];
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}

export function getStore(): MatchStore {
  if (globalForStore.__browCivViMatchStore === undefined) {
    const url = selectDatabaseUrl(process.env);
    if (url === undefined) {
      globalForStore.__browCivViMatchStore = new InMemoryMatchStore();
    } else {
      const adapter = new PrismaNeon({ connectionString: url });
      globalForStore.__browCivViMatchStore = new PrismaMatchStore(new PrismaClient({ adapter }));
    }
  }
  return globalForStore.__browCivViMatchStore;
}
