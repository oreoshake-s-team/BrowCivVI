import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import type { MatchStore } from "@/engine/match/store";
import { InMemoryMatchStore } from "@/engine/match/store";
import { PrismaMatchStore } from "@/persistence/prismaMatchStore";

let cached: MatchStore | undefined;

export function getStore(): MatchStore {
  if (cached === undefined) {
    const url = process.env.DATABASE_URL;
    if (url === undefined) {
      cached = new InMemoryMatchStore();
    } else {
      const adapter = new PrismaNeon({ connectionString: url });
      cached = new PrismaMatchStore(new PrismaClient({ adapter }));
    }
  }
  return cached;
}
