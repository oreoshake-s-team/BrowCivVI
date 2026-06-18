import type { MatchState } from "./state";
import { CURRENT_SCHEMA_VERSION } from "./state";

export class UnknownSchemaError extends Error {
  constructor(version: number) {
    super(`Unknown match schema version: ${version}`);
    this.name = "UnknownSchemaError";
  }
}

export function upcastMatchState(raw: unknown): MatchState {
  if (typeof raw !== "object" || raw === null) {
    throw new UnknownSchemaError(-1);
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (version === CURRENT_SCHEMA_VERSION) {
    return raw as MatchState;
  }
  throw new UnknownSchemaError(typeof version === "number" ? version : -1);
}
