import { describe, it, expect } from "vitest";
import { effectiveUnitStrength } from "../combat/resolveCombat";
import type { MatchState } from "../match/state";
import type { Unit } from "../unit/types";
import {
  applyOutOfSupplyAttrition,
  attritionRate,
  MIN_HP,
  OUT_OF_SUPPLY_MORALE,
} from "./attrition";

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

function stateWith(units: readonly Unit[]): MatchState {
  return { units } as unknown as MatchState;
}

function attrit(over: Partial<Unit>): Unit {
  const state = applyOutOfSupplyAttrition(stateWith([unit(over)]), "macedon");
  return state.units[0]!;
}

describe("attritionRate", () => {
  it("is zero while supplied", () => {
    expect(attritionRate(0)).toBe(0);
  });

  it("is the first-turn rate after one out-of-supply turn", () => {
    expect(attritionRate(1)).toBe(10);
  });

  it("escalates by the step each subsequent turn", () => {
    expect(attritionRate(2)).toBe(15);
  });

  it("caps at the maximum rate", () => {
    expect(attritionRate(5)).toBe(25);
  });
});

describe("applyOutOfSupplyAttrition", () => {
  it("starts the out-of-supply counter for an unsupplied unit", () => {
    expect(attrit({ supplied: false }).outOfSupplyTurns).toBe(1);
  });

  it("applies the first-turn HP loss", () => {
    expect(attrit({ supplied: false, hp: 100 }).hp).toBe(90);
  });

  it("bleeds morale each out-of-supply turn", () => {
    expect(attrit({ supplied: false, morale: 80 }).morale).toBe(80 - OUT_OF_SUPPLY_MORALE);
  });

  it("escalates HP loss with the accumulated counter", () => {
    expect(attrit({ supplied: false, outOfSupplyTurns: 1, hp: 100 }).hp).toBe(85);
  });

  it("floors HP at the minimum", () => {
    expect(attrit({ supplied: false, outOfSupplyTurns: 4, hp: 5 }).hp).toBe(MIN_HP);
  });

  it("never drops morale below zero", () => {
    expect(attrit({ supplied: false, morale: 2 }).morale).toBe(0);
  });

  it("resets the counter when a unit is resupplied", () => {
    expect(attrit({ supplied: true, outOfSupplyTurns: 3 }).outOfSupplyTurns).toBe(0);
  });

  it("leaves a healthy supplied unit untouched", () => {
    const original = unit({ supplied: true });
    expect(applyOutOfSupplyAttrition(stateWith([original]), "macedon").units[0]).toBe(original);
  });

  it("ignores units owned by another faction", () => {
    const persia = unit({ id: "p1", owner: "persia", supplied: false, hp: 100 });
    const result = applyOutOfSupplyAttrition(stateWith([persia]), "macedon").units[0]!;
    expect(result.hp).toBe(100);
  });
});

describe("attrition feeds the combat strength calculation", () => {
  const STRENGTH = 40;

  it("weakens a unit's effective strength once it goes out of supply", () => {
    const before = unit({ supplied: false, hp: 100, morale: 80 });
    const after = attrit({ supplied: false, hp: 100, morale: 80 });
    expect(effectiveUnitStrength(STRENGTH, after.hp, after.morale)).toBeLessThan(
      effectiveUnitStrength(STRENGTH, before.hp, before.morale),
    );
  });

  it("compounds the strength loss as the unit stays cut off", () => {
    const firstTurn = attrit({ supplied: false, hp: 100, morale: 80 });
    const laterTurn = attrit({ supplied: false, outOfSupplyTurns: 3, hp: 100, morale: 80 });
    expect(effectiveUnitStrength(STRENGTH, laterTurn.hp, laterTurn.morale)).toBeLessThan(
      effectiveUnitStrength(STRENGTH, firstTurn.hp, firstTurn.morale),
    );
  });
});
