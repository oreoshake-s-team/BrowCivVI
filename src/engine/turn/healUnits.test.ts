import { describe, it, expect } from "vitest";
import { FULL_HP } from "../combat/resolveCombat";
import type { Unit } from "../unit/types";
import { healUnits, UNIT_HEAL_RATE } from "./healUnits";

function unit(over: Partial<Unit> = {}): Unit {
  return {
    id: "u1",
    typeId: "pezhetairos",
    owner: "macedon",
    hex: { q: 0, r: 0 },
    hp: 50,
    morale: 80,
    supplied: true,
    hasMovedThisTurn: false,
    ...over,
  };
}

const hpOf = (units: readonly Unit[], id: string): number =>
  units.find((u) => u.id === id)?.hp ?? -1;

describe("healUnits", () => {
  it("heals an idle, supplied, wounded unit of the faction", () => {
    expect(hpOf(healUnits([unit({ hp: 50 })], "macedon"), "u1")).toBe(50 + UNIT_HEAL_RATE);
  });

  it("caps healing at full HP", () => {
    expect(hpOf(healUnits([unit({ hp: FULL_HP - 5 })], "macedon"), "u1")).toBe(FULL_HP);
  });

  it("leaves a full-HP unit unchanged", () => {
    const units = [unit({ hp: FULL_HP })];
    expect(healUnits(units, "macedon")[0]).toBe(units[0]);
  });

  it("does not heal a unit that moved this turn", () => {
    expect(hpOf(healUnits([unit({ hp: 50, hasMovedThisTurn: true })], "macedon"), "u1")).toBe(50);
  });

  it("does not heal a unit that attacked this turn", () => {
    expect(hpOf(healUnits([unit({ hp: 50, hasAttackedThisTurn: true })], "macedon"), "u1")).toBe(
      50,
    );
  });

  it("does not heal an out-of-supply unit", () => {
    expect(hpOf(healUnits([unit({ hp: 50, supplied: false })], "macedon"), "u1")).toBe(50);
  });

  it("does not heal a unit of another faction", () => {
    expect(hpOf(healUnits([unit({ hp: 50, owner: "persia" })], "macedon"), "u1")).toBe(50);
  });
});
