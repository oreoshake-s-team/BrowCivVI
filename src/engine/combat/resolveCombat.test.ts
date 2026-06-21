import { describe, it, expect } from "vitest";
import { createRng, type Rng } from "../rng";
import {
  effectiveUnitStrength,
  resolveCombat,
  type CombatInput,
  type CombatSide,
} from "./resolveCombat";

const side = (
  strength: number,
  hp: number,
  abilities: readonly string[] = [],
  adjacentAllies = 0,
): CombatSide => ({ strength, hp, abilities, adjacentAllies });

function makeInput(rng: Rng, over: Partial<CombatInput> = {}): CombatInput {
  return {
    attacker: side(40, 100),
    defender: side(30, 100),
    defenderTerrainDefense: 0,
    defenderTerrainMoveCost: 1,
    flanked: false,
    riverAttack: false,
    rng,
    ...over,
  };
}

describe("effectiveUnitStrength", () => {
  it("is unchanged at full HP and baseline morale", () => {
    expect(effectiveUnitStrength(35, 100, 80)).toBe(35);
  });

  it("applies the Civ 6 wounded penalty of -5 at half HP", () => {
    expect(effectiveUnitStrength(35, 50, 80)).toBe(30);
  });

  it("approaches the -10 wounded penalty near death", () => {
    expect(effectiveUnitStrength(35, 10, 80)).toBeCloseTo(26);
  });

  it("boosts strength above the baseline morale", () => {
    expect(effectiveUnitStrength(100, 100, 90)).toBeCloseTo(107);
  });

  it("weakens strength below the baseline morale", () => {
    expect(effectiveUnitStrength(100, 100, 70)).toBeCloseTo(93);
  });

  it("floors the morale penalty at -15% for very low morale", () => {
    expect(effectiveUnitStrength(100, 100, 0)).toBeCloseTo(85);
  });

  it("never drops below 1", () => {
    expect(effectiveUnitStrength(2, 0, 0)).toBe(1);
  });
});

describe("resolveCombat", () => {
  it("is deterministic for a given seed", () => {
    expect(resolveCombat(makeInput(createRng(1)))).toEqual(resolveCombat(makeInput(createRng(1))));
  });

  it("hits a weaker defender harder than it is hit back", () => {
    const result = resolveCombat(
      makeInput(createRng(2), { attacker: side(45, 100), defender: side(20, 100) }),
    );
    expect(result.defenderDamage > result.attackerDamage).toBe(true);
  });

  it("always deals at least one damage", () => {
    const result = resolveCombat(
      makeInput(createRng(3), { attacker: side(5, 100), defender: side(60, 100) }),
    );
    expect(result.defenderDamage).toBeGreaterThanOrEqual(1);
  });

  it("never deals more than the defender's remaining HP", () => {
    const result = resolveCombat(makeInput(createRng(4), { defender: side(30, 5) }));
    expect(result.defenderDamage).toBeLessThanOrEqual(5);
  });

  it("defeats a defender on its last hit point", () => {
    const result = resolveCombat(makeInput(createRng(5), { defender: side(30, 1) }));
    expect(result.defenderDefeated).toBe(true);
  });

  it("a flanked phalangite takes more damage than an unflanked one", () => {
    const unflanked = resolveCombat(
      makeInput(createRng(6), { defender: side(30, 100, ["phalanx"]), flanked: false }),
    );
    const flanked = resolveCombat(
      makeInput(createRng(6), { defender: side(30, 100, ["phalanx"]), flanked: true }),
    );
    expect(flanked.defenderDamage > unflanked.defenderDamage).toBe(true);
  });

  it("a river attack deals less damage to the defender than an attack on open ground", () => {
    const open = resolveCombat(makeInput(createRng(8), { riverAttack: false }));
    const river = resolveCombat(makeInput(createRng(8), { riverAttack: true }));
    expect(river.defenderDamage < open.defenderDamage).toBe(true);
  });

  it("rough terrain weakens the phalanx wall", () => {
    const open = resolveCombat(
      makeInput(createRng(7), { defender: side(30, 100, ["phalanx"]), defenderTerrainMoveCost: 1 }),
    );
    const rough = resolveCombat(
      makeInput(createRng(7), { defender: side(30, 100, ["phalanx"]), defenderTerrainMoveCost: 2 }),
    );
    expect(rough.defenderDamage > open.defenderDamage).toBe(true);
  });

  it("terrain defense reduces damage to the defender", () => {
    const flat = resolveCombat(makeInput(createRng(8), { defenderTerrainDefense: 0 }));
    const defended = resolveCombat(makeInput(createRng(8), { defenderTerrainDefense: 0.5 }));
    expect(defended.defenderDamage < flat.defenderDamage).toBe(true);
  });

  it("adjacent phalangites shield a phalangite defender", () => {
    const alone = resolveCombat(
      makeInput(createRng(9), { defender: side(30, 100, ["phalanx"], 0) }),
    );
    const massed = resolveCombat(
      makeInput(createRng(9), { defender: side(30, 100, ["phalanx"], 3) }),
    );
    expect(massed.defenderDamage < alone.defenderDamage).toBe(true);
  });

  it("adjacent phalangites strengthen a phalangite attacker", () => {
    const alone = resolveCombat(
      makeInput(createRng(10), { attacker: side(40, 100, ["phalanx"], 0) }),
    );
    const massed = resolveCombat(
      makeInput(createRng(10), { attacker: side(40, 100, ["phalanx"], 3) }),
    );
    expect(massed.defenderDamage > alone.defenderDamage).toBe(true);
  });
});
