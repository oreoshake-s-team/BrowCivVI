import { randomUUID } from "node:crypto";
import { FIRST_SLICE_CITIES, FIRST_SLICE_UNITS } from "@/content/firstSlice";
import type { City } from "@/engine/map/types";
import { seedCities } from "@/engine/match/cities";
import type { MatchState } from "@/engine/match/state";
import { createMatch } from "@/engine/match/state";
import type { MatchStore } from "@/engine/match/store";
import { unitTypeById } from "@/engine/unit/catalog";

const TURN_LIMIT = 20;

const AUTHORED_CITIES: Readonly<Record<string, readonly City[]>> = {
  "first-slice": FIRST_SLICE_CITIES,
};

export function backfillCities(match: MatchState): MatchState {
  if (match.cities.length > 0) return match;
  const authored = AUTHORED_CITIES[match.mapId];
  if (authored === undefined) return match;
  return { ...match, cities: seedCities(authored) };
}

const movementOf = (typeId: string): number => unitTypeById(typeId)?.movement ?? 0;

function seedFrom(value: string): number {
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return hash >>> 0;
}

export function newMatchState(id: string, owner: string): MatchState {
  return createMatch({
    id,
    owner,
    seed: seedFrom(id),
    mapId: "first-slice",
    turnLimit: TURN_LIMIT,
    units: FIRST_SLICE_UNITS,
    movementOf,
    cities: FIRST_SLICE_CITIES,
  });
}

export async function getOrCreateDefault(store: MatchStore, owner: string): Promise<MatchState> {
  const id = `default-${seedFrom(owner).toString(36)}`;
  const existing = await store.load(id);
  if (existing !== null) return backfillCities(existing);
  const state = newMatchState(id, owner);
  await store.create(state);
  return state;
}

export async function createNewMatch(store: MatchStore, owner: string): Promise<MatchState> {
  const state = newMatchState(randomUUID(), owner);
  await store.create(state);
  return state;
}

export async function loadOwned(
  store: MatchStore,
  owner: string,
  id: string,
): Promise<MatchState | null> {
  const match = await store.load(id);
  return match !== null && match.owner === owner ? backfillCities(match) : null;
}
