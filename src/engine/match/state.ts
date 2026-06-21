import type { City } from "../map/types";
import type { Unit } from "../unit/types";
import type { CityState } from "./cities";
import { seedCities } from "./cities";
import type { MatchEvent } from "./events";

export const CURRENT_SCHEMA_VERSION = 6;

export interface DivergenceRecord {
  readonly choice: string;
  readonly rival: string;
}

export interface MatchState {
  readonly id: string;
  readonly schemaVersion: number;
  readonly version: number;
  readonly owner: string | null;
  readonly seed: number;
  readonly mapId: string;
  readonly turn: number;
  readonly turnLimit: number;
  readonly turnOrder: readonly string[];
  readonly activeFaction: string;
  readonly units: readonly Unit[];
  readonly movement: Readonly<Record<string, number>>;
  readonly events: readonly MatchEvent[];
  readonly cities: readonly CityState[];
  readonly divergence: Readonly<Record<string, DivergenceRecord>>;
  readonly scorched: readonly string[];
}

export interface CreateMatchInput {
  readonly id: string;
  readonly seed: number;
  readonly mapId: string;
  readonly turnLimit: number;
  readonly units: readonly Unit[];
  readonly movementOf: (typeId: string) => number;
  readonly owner?: string | null;
  readonly factions?: readonly string[];
  readonly cities?: readonly City[];
}

export function createMatch(input: CreateMatchInput): MatchState {
  const movement: Record<string, number> = {};
  for (const unit of input.units) movement[unit.id] = input.movementOf(unit.typeId);
  const turnOrder = input.factions ?? [...new Set(input.units.map((unit) => unit.owner))];
  return {
    id: input.id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    version: 0,
    owner: input.owner ?? null,
    seed: input.seed,
    mapId: input.mapId,
    turn: 1,
    turnLimit: input.turnLimit,
    turnOrder,
    activeFaction: turnOrder[0] ?? "",
    units: input.units,
    movement,
    events: [],
    cities: seedCities(input.cities ?? []),
    divergence: {},
    scorched: [],
  };
}
