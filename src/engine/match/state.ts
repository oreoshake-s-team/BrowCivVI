import type { Unit } from "../unit/types";

export const CURRENT_SCHEMA_VERSION = 1;

export interface MatchState {
  readonly id: string;
  readonly schemaVersion: number;
  readonly version: number;
  readonly owner: string | null;
  readonly seed: number;
  readonly mapId: string;
  readonly turn: number;
  readonly turnLimit: number;
  readonly units: readonly Unit[];
  readonly movement: Readonly<Record<string, number>>;
}

export interface CreateMatchInput {
  readonly id: string;
  readonly seed: number;
  readonly mapId: string;
  readonly turnLimit: number;
  readonly units: readonly Unit[];
  readonly movementOf: (typeId: string) => number;
  readonly owner?: string | null;
}

export function createMatch(input: CreateMatchInput): MatchState {
  const movement: Record<string, number> = {};
  for (const unit of input.units) movement[unit.id] = input.movementOf(unit.typeId);
  return {
    id: input.id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    version: 0,
    owner: input.owner ?? null,
    seed: input.seed,
    mapId: input.mapId,
    turn: 1,
    turnLimit: input.turnLimit,
    units: input.units,
    movement,
  };
}
