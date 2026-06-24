import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { applyDefend, rampFortify } from "./defend";
import { createMatch, type MatchState } from "./state";

function unit(over: Partial<Unit> = {}): Unit {
  return {
    id: "u1",
    typeId: "pezhetairos",
    owner: "macedon",
    hex: { q: 0, r: 0 },
    hp: 100,
    morale: 80,
    supplied: true,
    hasMovedThisTurn: false,
    ...over,
  };
}

function state(units: readonly Unit[], over: Partial<MatchState> = {}): MatchState {
  const base = createMatch({
    id: "m1",
    seed: 1,
    mapId: "first-slice",
    turnLimit: 20,
    units: [...units],
    movementOf: () => 4,
  });
  return { ...base, activeFaction: "macedon", ...over };
}

describe("applyDefend", () => {
  it("fortifies an idle unit to level one", () => {
    expect(applyDefend(state([unit()]), "macedon", "u1")?.units[0]?.fortifiedTurns).toBe(1);
  });

  it("consumes all of the unit's movement", () => {
    expect(applyDefend(state([unit()]), "macedon", "u1")?.movement.u1).toBe(0);
  });

  it("keeps an already-higher fortify level", () => {
    const result = applyDefend(state([unit({ fortifiedTurns: 2 })]), "macedon", "u1");
    expect(result?.units[0]?.fortifiedTurns).toBe(2);
  });

  it("rejects a unit that already moved this turn", () => {
    expect(applyDefend(state([unit({ hasMovedThisTurn: true })]), "macedon", "u1")).toBeNull();
  });

  it("rejects when it is not the faction's turn", () => {
    expect(applyDefend(state([unit()], { activeFaction: "persia" }), "macedon", "u1")).toBeNull();
  });

  it("rejects a unit of another faction", () => {
    expect(applyDefend(state([unit({ owner: "persia" })]), "macedon", "u1")).toBeNull();
  });
});

describe("rampFortify", () => {
  it("ramps a first-turn fortify to the capped level", () => {
    expect(rampFortify([unit({ fortifiedTurns: 1 })], "macedon")[0]?.fortifiedTurns).toBe(2);
  });

  it("does not exceed the cap", () => {
    const units = [unit({ fortifiedTurns: 2 })];
    expect(rampFortify(units, "macedon")[0]).toBe(units[0]);
  });

  it("leaves an unfortified unit untouched", () => {
    const units = [unit()];
    expect(rampFortify(units, "macedon")[0]).toBe(units[0]);
  });

  it("leaves another faction's fortified unit untouched", () => {
    const units = [unit({ owner: "persia", fortifiedTurns: 1 })];
    expect(rampFortify(units, "macedon")[0]).toBe(units[0]);
  });
});
