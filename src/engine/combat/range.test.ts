import { describe, it, expect } from "vitest";
import type { UnitType } from "../unit/types";
import {
  attackRange,
  isBombardAttacker,
  isRangedAttacker,
  MELEE_RANGE,
  RANGED_RANGE,
  siegeCityMultiplier,
} from "./range";

const type = (over: Partial<UnitType>): UnitType => ({
  id: "t",
  name: "T",
  class: "melee",
  movement: 2,
  strength: 30,
  ...over,
});

describe("isRangedAttacker", () => {
  it("is false for a melee class", () => {
    expect(isRangedAttacker(type({ class: "melee" }))).toBe(false);
  });

  it("is true for a ranged class", () => {
    expect(isRangedAttacker(type({ class: "ranged" }))).toBe(true);
  });

  it("is true for a siege class", () => {
    expect(isRangedAttacker(type({ class: "siege" }))).toBe(true);
  });
});

describe("isBombardAttacker", () => {
  it("is true only for a siege class", () => {
    expect(isBombardAttacker(type({ class: "siege" }))).toBe(true);
  });

  it("is false for a plain ranged class", () => {
    expect(isBombardAttacker(type({ class: "ranged" }))).toBe(false);
  });
});

describe("attackRange", () => {
  it("is the melee range for a melee class", () => {
    expect(attackRange(type({ class: "melee" }))).toBe(MELEE_RANGE);
  });

  it("is the ranged range for a ranged class", () => {
    expect(attackRange(type({ class: "ranged" }))).toBe(RANGED_RANGE);
  });

  it("is the ranged range for a siege class", () => {
    expect(attackRange(type({ class: "siege" }))).toBe(RANGED_RANGE);
  });

  it("honors an explicit per-type range override", () => {
    expect(attackRange(type({ class: "ranged", range: 3 }))).toBe(3);
  });
});

describe("siegeCityMultiplier", () => {
  it("boosts a bombard attacker against a city", () => {
    expect(siegeCityMultiplier(true)).toBeGreaterThan(1);
  });

  it("leaves a non-bombard attacker unmodified", () => {
    expect(siegeCityMultiplier(false)).toBe(1);
  });
});
