import type { Unit } from "../unit/types";
import type { MatchEvent } from "./events";
import type { MatchState } from "./state";
import { CURRENT_SCHEMA_VERSION } from "./state";

export class UnknownSchemaError extends Error {
  constructor(version: number) {
    super(`Unknown match schema version: ${version}`);
    this.name = "UnknownSchemaError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function decodeMatchState(raw: unknown): MatchState {
  if (!isRecord(raw)) throw new UnknownSchemaError(-1);
  const version = raw.schemaVersion;
  if (typeof version !== "number" || version > CURRENT_SCHEMA_VERSION) {
    throw new UnknownSchemaError(typeof version === "number" ? version : -1);
  }

  const units = Array.isArray(raw.units) ? (raw.units as readonly Unit[]) : [];
  const turnOrder =
    Array.isArray(raw.turnOrder) && raw.turnOrder.length > 0
      ? (raw.turnOrder as readonly string[])
      : [...new Set(units.map((unit) => unit.owner))];

  return {
    ...(raw as Partial<MatchState>),
    units,
    turnOrder,
    activeFaction: typeof raw.activeFaction === "string" ? raw.activeFaction : (turnOrder[0] ?? ""),
    events: Array.isArray(raw.events) ? (raw.events as readonly MatchEvent[]) : [],
    schemaVersion: CURRENT_SCHEMA_VERSION,
  } as MatchState;
}
