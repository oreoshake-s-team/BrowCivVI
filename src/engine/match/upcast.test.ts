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

  it("derives turn order from unit owners when upcasting a v1 record", () => {
    const v1 = { schemaVersion: 1, units: [{ owner: "macedon" }, { owner: "persia" }] };
    expect(upcastMatchState(v1).turnOrder).toEqual(["macedon", "persia"]);
  });

  it("activates the first faction when upcasting a v1 record", () => {
    const v1 = { schemaVersion: 1, units: [{ owner: "macedon" }, { owner: "persia" }] };
    expect(upcastMatchState(v1).activeFaction).toBe("macedon");
  });

  it("defaults the event log to empty when upcasting a v2 record", () => {
    const v2 = { ...STATE, schemaVersion: 2, events: undefined };
    expect(upcastMatchState(v2).events).toEqual([]);
  });

  it("preserves an existing event log when upcasting a v2 record", () => {
    const event = { kind: "move", seq: 0 };
    const v2 = { ...STATE, schemaVersion: 2, events: [event] };
    expect(upcastMatchState(v2).events).toEqual([event]);
  });
});
