import { describe, it, expect } from "vitest";
import { createRng, type Rng } from "../rng";
import { resolveAttack, type AttackUnit, type ResolveAttackInput } from "./attack";

const unit = (
  q: number,
  r: number,
  owner: string,
  abilities: readonly string[] = [],
): AttackUnit => ({ hex: { q, r }, owner, strength: 30, hp: 100, abilities });

function input(rng: Rng, over: Partial<ResolveAttackInput> = {}): ResolveAttackInput {
  return {
    attacker: unit(0, 0, "a"),
    defender: unit(1, 0, "b"),
    others: [],
    defenderTerrainDefense: 0,
    defenderTerrainMoveCost: 1,
    riverAttack: false,
    rng,
    ...over,
  };
}

describe("resolveAttack", () => {
  it("resolves an attack into combat damage", () => {
    expect(resolveAttack(input(createRng(1))).defenderDamage).toBeGreaterThanOrEqual(1);
  });

  it("a friendly unit opposite the defender flanks it for more damage", () => {
    const open = resolveAttack(input(createRng(2)));
    const pincer = resolveAttack(input(createRng(2), { others: [unit(2, 0, "a")] }));
    expect(pincer.defenderDamage > open.defenderDamage).toBe(true);
  });

  it("an adjacent friendly phalangite strengthens a phalangite attacker", () => {
    const alone = resolveAttack(input(createRng(3), { attacker: unit(0, 0, "a", ["phalanx"]) }));
    const massed = resolveAttack(
      input(createRng(3), {
        attacker: unit(0, 0, "a", ["phalanx"]),
        others: [unit(0, 1, "a", ["phalanx"])],
      }),
    );
    expect(massed.defenderDamage > alone.defenderDamage).toBe(true);
  });
});
