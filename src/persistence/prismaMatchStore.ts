import type { Prisma, PrismaClient } from "@prisma/client";
import { decodeMatchState } from "@/engine/match/decode";
import type { MatchState } from "@/engine/match/state";
import type { MatchStore } from "@/engine/match/store";
import { StaleMatchError } from "@/engine/match/store";

type MatchClient = Pick<PrismaClient, "match">;

function toJson(state: MatchState): Prisma.InputJsonValue {
  return state as unknown as Prisma.InputJsonValue;
}

export class PrismaMatchStore implements MatchStore {
  constructor(private readonly prisma: MatchClient) {}

  async create(state: MatchState): Promise<void> {
    await this.prisma.match.create({
      data: {
        id: state.id,
        owner: state.owner,
        version: state.version,
        schemaVersion: state.schemaVersion,
        state: toJson(state),
      },
    });
  }

  async load(id: string): Promise<MatchState | null> {
    const row = await this.prisma.match.findUnique({
      where: { id },
      select: { state: true, version: true },
    });
    if (row === null) return null;
    return { ...decodeMatchState(row.state), version: row.version };
  }

  async save(state: MatchState): Promise<MatchState> {
    const next: MatchState = { ...state, version: state.version + 1 };
    const { count } = await this.prisma.match.updateMany({
      where: { id: state.id, version: state.version },
      data: { state: toJson(next), version: next.version, updatedAt: new Date() },
    });
    if (count === 0) throw new StaleMatchError(state.id);
    return next;
  }
}
