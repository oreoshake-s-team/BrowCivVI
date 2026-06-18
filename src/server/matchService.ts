import { FIRST_SLICE_UNITS } from "@/content/firstSlice";
import type { MatchState } from "@/engine/match/state";
import { createMatch } from "@/engine/match/state";
import type { MatchStore } from "@/engine/match/store";
import { unitTypeById } from "@/engine/unit/catalog";

const TURN_LIMIT = 20;

const movementOf = (typeId: string): number => unitTypeById(typeId)?.movement ?? 0;

function seedFrom(owner: string): number {
  let hash = 0;
  for (const ch of owner) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return hash >>> 0;
}

export function newMatchState(owner: string): MatchState {
  return createMatch({
    id: owner,
    owner,
    seed: seedFrom(owner),
    mapId: "first-slice",
    turnLimit: TURN_LIMIT,
    units: FIRST_SLICE_UNITS,
    movementOf,
  });
}

export async function getOrCreateMatch(store: MatchStore, owner: string): Promise<MatchState> {
  const existing = await store.load(owner);
  if (existing !== null) return existing;
  const state = newMatchState(owner);
  await store.create(state);
  return state;
}
