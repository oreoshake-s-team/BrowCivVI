import type { Rng } from "../rng";
import { unitTypeById } from "../unit/catalog";
import type { Unit } from "../unit/types";
import { resolveAttack, type AttackUnit } from "./attack";

export interface ApplyAttackInput {
  readonly units: readonly Unit[];
  readonly movement: Readonly<Record<string, number>>;
  readonly attackerId: string;
  readonly defenderId: string;
  readonly defenderTerrainDefense: number;
  readonly defenderTerrainMoveCost: number;
  readonly riverAttack: boolean;
  readonly rng: Rng;
}

export interface AttackApplication {
  readonly units: readonly Unit[];
  readonly movement: Readonly<Record<string, number>>;
  readonly attackerDamage: number;
  readonly defenderDamage: number;
  readonly defeated: readonly string[];
}

function toAttackUnit(unit: Unit): AttackUnit {
  const type = unitTypeById(unit.typeId);
  return {
    hex: unit.hex,
    owner: unit.owner,
    strength: type?.strength ?? 0,
    hp: unit.hp,
    abilities: type?.abilities ?? [],
  };
}

export function applyAttack(input: ApplyAttackInput): AttackApplication {
  const attacker = input.units.find((unit) => unit.id === input.attackerId);
  const defender = input.units.find((unit) => unit.id === input.defenderId);
  if (attacker === undefined || defender === undefined) {
    return {
      units: input.units,
      movement: input.movement,
      attackerDamage: 0,
      defenderDamage: 0,
      defeated: [],
    };
  }

  const result = resolveAttack({
    attacker: toAttackUnit(attacker),
    defender: toAttackUnit(defender),
    others: input.units
      .filter((unit) => unit.id !== input.attackerId && unit.id !== input.defenderId)
      .map(toAttackUnit),
    defenderTerrainDefense: input.defenderTerrainDefense,
    defenderTerrainMoveCost: input.defenderTerrainMoveCost,
    riverAttack: input.riverAttack,
    rng: input.rng,
  });

  const units = input.units
    .map((unit) => {
      if (unit.id === input.attackerId)
        return { ...unit, hp: unit.hp - result.attackerDamage, hasAttackedThisTurn: true };
      if (unit.id === input.defenderId) return { ...unit, hp: unit.hp - result.defenderDamage };
      return unit;
    })
    .filter((unit) => unit.hp > 0);

  const defeated = [input.attackerId, input.defenderId].filter(
    (id) => !units.some((unit) => unit.id === id),
  );

  const retainsMovement = unitTypeById(attacker.typeId)?.hitAndRun === true;
  const movement = retainsMovement ? input.movement : { ...input.movement, [input.attackerId]: 0 };

  return {
    units,
    movement,
    attackerDamage: result.attackerDamage,
    defenderDamage: result.defenderDamage,
    defeated,
  };
}
