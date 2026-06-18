import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { createMatch } from "./state";
import { upcastMatchState, UnknownSchemaError } from "./upcast";

const UNIT: Unit = {
  id: "u1",
  typeId: "pezhetairos",
  owner: "macedon",
  hex: { q: 0, r: 0 },
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
};

const STATE = createMatch({
  id: "m1",
  seed: 7,
  mapId: "first-slice",
  turnLimit: 20,
  units: [UNIT],
  movementOf: () => 4,
});

describe("upcastMatchState", () => {
  it("returns the state at the current schema version", () => {
    expect(upcastMatchState(STATE).id).toBe("m1");
  });

  it("throws for an unknown schema version", () => {
    expect(() => upcastMatchState({ ...STATE, schemaVersion: 99 })).toThrow(UnknownSchemaError);
  });

  it("throws for a non-object value", () => {
    expect(() => upcastMatchState("nope")).toThrow(UnknownSchemaError);
  });
});
