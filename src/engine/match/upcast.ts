import type { MatchState } from "./state";
import { CURRENT_SCHEMA_VERSION } from "./state";

export class UnknownSchemaError extends Error {
  constructor(version: number) {
    super(`Unknown match schema version: ${version}`);
    this.name = "UnknownSchemaError";
  }
}

function upcastV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const owners = Array.isArray(raw.units)
    ? raw.units.flatMap((u) =>
        typeof (u as { owner?: unknown }).owner === "string"
          ? [(u as { owner: string }).owner]
          : [],
      )
    : [];
  const turnOrder = [...new Set(owners.length > 0 ? owners : ["macedon", "persia"])];
  return {
    ...raw,
    schemaVersion: 2,
    turnOrder,
    activeFaction: typeof raw.activeFaction === "string" ? raw.activeFaction : (turnOrder[0] ?? ""),
  };
}

export function upcastMatchState(raw: unknown): MatchState {
  if (typeof raw !== "object" || raw === null) {
    throw new UnknownSchemaError(-1);
  }
  let current = raw as Record<string, unknown>;
  if (current.schemaVersion === 1) {
    current = upcastV1ToV2(current);
  }
  if (current.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return current as unknown as MatchState;
  }
  const version = current.schemaVersion;
  throw new UnknownSchemaError(typeof version === "number" ? version : -1);
}
