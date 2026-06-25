import { describe, it, expect } from "vitest";
import { createRng } from "../rng";
import type { GeneralAura } from "../unit/greatGenerals";
import type { Unit } from "../unit/types";
import { applyAttack, type ApplyAttackInput } from "./applyAttack";
import { resolveAttack, type AttackUnit, type ResolveAttackInput } from "./attack";

const PARMENION_AURA: GeneralAura = { radius: 2, defenderStrengthMultiplier: 1.25 };

const attackUnit = (
  q: number,
  r: number,
  owner: string,
  over: Partial<AttackUnit> = {},
): AttackUnit => ({
  hex: { q, r },
  owner,
  strength: 30,
  hp: 100,
  morale: 80,
  abilities: [],
  ...over,
});

function attackInput(over: Partial<ResolveAttackInput> = {}): ResolveAttackInput {
  return {
    attacker: attackUnit(0, 0, "a"),
    defender: attackUnit(1, 0, "b"),
    others: [],
    defenderTerrainDefense: 0,
    defenderTerrainMoveCost: 1,
    riverAttack: false,
    rng: createRng(5),
    ...over,
  };
}

describe("great-general defensive aura", () => {
  it("a friendly general within range reduces damage to the defender", () => {
    const general = attackUnit(2, 0, "b", { generalAura: PARMENION_AURA });
    const open = resolveAttack(attackInput());
    const shielded = resolveAttack(attackInput({ others: [general] }));
    expect(shielded.defenderDamage < open.defenderDamage).toBe(true);
  });

  it("an enemy general does not shield the defender", () => {
    const enemyGeneral = attackUnit(1, 1, "a", { generalAura: PARMENION_AURA });
    const open = resolveAttack(attackInput());
    const withEnemy = resolveAttack(attackInput({ others: [enemyGeneral] }));
    expect(withEnemy.defenderDamage).toBe(open.defenderDamage);
  });

  it("a general beyond its aura radius does not shield the defender", () => {
    const farGeneral = attackUnit(5, 0, "b", { generalAura: PARMENION_AURA });
    const open = resolveAttack(attackInput());
    const withFar = resolveAttack(attackInput({ others: [farGeneral] }));
    expect(withFar.defenderDamage).toBe(open.defenderDamage);
  });
});

const gameUnit = (id: string, typeId: string, owner: string, q: number, r: number): Unit => ({
  id,
  typeId,
  owner,
  hex: { q, r },
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

function applyInput(units: readonly Unit[]): ApplyAttackInput {
  return {
    units,
    movement: { p1: 4, m1: 2, g1: 3 },
    attackerId: "p1",
    defenderId: "m1",
    defenderTerrainDefense: 0,
    defenderTerrainMoveCost: 1,
    riverAttack: false,
    rng: createRng(5),
  };
}

describe("Parmenion shields a Macedonian defender through applyAttack", () => {
  const attacker = gameUnit("p1", "persian-cavalry", "persia", 1, 1);
  const defender = gameUnit("m1", "pezhetairos", "macedon", 2, 1);
  const parmenion = gameUnit("g1", "parmenion", "macedon", 2, 0);

  it("reduces the defender's incurred damage when Parmenion stands in range", () => {
    const open = applyAttack(applyInput([attacker, defender]));
    const guarded = applyAttack(applyInput([attacker, defender, parmenion]));
    expect(guarded.defenderDamage < open.defenderDamage).toBe(true);
  });
});
