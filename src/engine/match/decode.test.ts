import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { decodeMatchState, UnknownSchemaError } from "./decode";
import { createMatch } from "./state";

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

describe("decodeMatchState", () => {
  it("returns the decoded match", () => {
    expect(decodeMatchState(STATE).id).toBe("m1");
  });

  it("preserves the stored schema version so an outdated save is detectable", () => {
    const legacy = { ...STATE, schemaVersion: 2 };
    expect(decodeMatchState(legacy).schemaVersion).toBe(2);
  });

  it("keeps a current-version save at the current schema version", () => {
    expect(decodeMatchState(STATE).schemaVersion).toBe(STATE.schemaVersion);
  });

  it("throws for a schema version newer than the engine understands", () => {
    expect(() => decodeMatchState({ ...STATE, schemaVersion: 99 })).toThrow(UnknownSchemaError);
  });

  it("throws when the schema version is missing", () => {
    expect(() => decodeMatchState({ id: "m1", units: [UNIT] })).toThrow(UnknownSchemaError);
  });

  it("throws for a non-object value", () => {
    expect(() => decodeMatchState("nope")).toThrow(UnknownSchemaError);
  });

  it("derives turn order from unit owners when it is absent", () => {
    const legacy = { schemaVersion: 1, units: [{ owner: "macedon" }, { owner: "persia" }] };
    expect(decodeMatchState(legacy).turnOrder).toEqual(["macedon", "persia"]);
  });

  it("activates the first faction when the active faction is absent", () => {
    const legacy = { schemaVersion: 1, units: [{ owner: "macedon" }, { owner: "persia" }] };
    expect(decodeMatchState(legacy).activeFaction).toBe("macedon");
  });

  it("defaults the event log to empty when it is absent", () => {
    const legacy = { ...STATE, schemaVersion: 2, events: undefined };
    expect(decodeMatchState(legacy).events).toEqual([]);
  });

  it("preserves an existing event log", () => {
    const event = { kind: "move", seq: 0 };
    const legacy = { ...STATE, schemaVersion: 2, events: [event] };
    expect(decodeMatchState(legacy).events).toEqual([event]);
  });

  it("defaults city state to empty when it is absent", () => {
    const legacy = { ...STATE, cities: undefined };
    expect(decodeMatchState(legacy).cities).toEqual([]);
  });

  it("preserves existing city state", () => {
    const city = { id: "sardis", owner: "persia", hp: 192 };
    const stored = { ...STATE, cities: [city] };
    expect(decodeMatchState(stored).cities).toEqual([city]);
  });

  it("defaults divergence choices to empty when absent", () => {
    const legacy = { ...STATE, schemaVersion: 3, divergence: undefined };
    expect(decodeMatchState(legacy).divergence).toEqual({});
  });

  it("preserves recorded divergence choices", () => {
    const divergence = { granicus: { choice: "reckless", rival: "scorched" } };
    const legacy = { ...STATE, schemaVersion: 3, divergence };
    expect(decodeMatchState(legacy).divergence).toEqual(divergence);
  });

  it("defaults burned hexes to empty when absent", () => {
    const legacy = { ...STATE, schemaVersion: 4, scorched: undefined };
    expect(decodeMatchState(legacy).scorched).toEqual([]);
  });

  it("preserves recorded burned hexes", () => {
    const stored = { ...STATE, scorched: ["7,2", "8,2"] };
    expect(decodeMatchState(stored).scorched).toEqual(["7,2", "8,2"]);
  });
});
