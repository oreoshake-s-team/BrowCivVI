import { randomUUID } from "node:crypto";
import {
  FIRST_SLICE_CITIES,
  FIRST_SLICE_PLAYER_FACTION,
  FIRST_SLICE_UNITS,
} from "@/content/firstSlice";
import { cityScore } from "@/engine/match/scoring";
import type { MatchState } from "@/engine/match/state";
import { createMatch } from "@/engine/match/state";
import type { MatchStore } from "@/engine/match/store";
import { unitTypeById } from "@/engine/unit/catalog";

const TURN_LIMIT = 20;

const movementOf = (typeId: string): number => unitTypeById(typeId)?.movement ?? 0;

const CITY_VALUES = new Map(FIRST_SLICE_CITIES.map((city) => [city.id, city.value]));

const cityValueOf = (cityId: string): number => CITY_VALUES.get(cityId) ?? 0;

export interface MatchSummary {
  readonly id: string;
  readonly turn: number;
  readonly turnLimit: number;
  readonly score: number;
  readonly updatedAt: number;
}

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
  if (existing !== null) return existing;
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
  return match !== null && match.owner === owner ? match : null;
}

export async function listOwnedSummaries(
  store: MatchStore,
  owner: string,
): Promise<readonly MatchSummary[]> {
  const owned = await store.listByOwner(owner);
  return owned
    .map(({ state, updatedAt }) => ({
      id: state.id,
      turn: state.turn,
      turnLimit: state.turnLimit,
      score: cityScore(state.cities, FIRST_SLICE_PLAYER_FACTION, cityValueOf),
      updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
