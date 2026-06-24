import type { Hex, HexDirection } from "../hex";
import { HEX_DIRECTION_COUNT, neighbor } from "../hex";
import type { Rng } from "../rng";
import { isFlanked } from "./flanking";
import { fortifyStrengthBonus } from "./fortify";
import { PHALANX_ABILITY } from "./phalanx";
import { effectiveUnitStrength, resolveCombat, type CombatResult } from "./resolveCombat";

export interface AttackUnit {
  readonly hex: Hex;
  readonly owner: string;
  readonly strength: number;
  readonly hp: number;
  readonly morale: number;
  readonly abilities: readonly string[];
  readonly fortifiedTurns?: number;
}

export interface ResolveAttackInput {
  readonly attacker: AttackUnit;
  readonly defender: AttackUnit;
  readonly others: readonly AttackUnit[];
  readonly defenderTerrainDefense: number;
  readonly defenderTerrainMoveCost: number;
  readonly riverAttack: boolean;
  readonly ranged?: boolean;
  readonly rng: Rng;
}

const sameHex = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r;

function adjacentPhalangites(hex: Hex, owner: string, units: readonly AttackUnit[]): number {
  let count = 0;
  for (let dir = 0; dir < HEX_DIRECTION_COUNT; dir++) {
    const step = neighbor(hex, dir as HexDirection);
    if (
      units.some(
        (unit) =>
          sameHex(unit.hex, step) &&
          unit.owner === owner &&
          unit.abilities.includes(PHALANX_ABILITY),
      )
    ) {
      count += 1;
    }
  }
  return count;
}

export function resolveAttack(input: ResolveAttackInput): CombatResult {
  const flanked = isFlanked(input.defender.hex, input.attacker.hex, (hex) =>
    input.others.some((unit) => sameHex(unit.hex, hex) && unit.owner === input.attacker.owner),
  );
  return resolveCombat({
    attacker: {
      strength: effectiveUnitStrength(
        input.attacker.strength,
        input.attacker.hp,
        input.attacker.morale,
      ),
      hp: input.attacker.hp,
      abilities: input.attacker.abilities,
      adjacentAllies: adjacentPhalangites(input.attacker.hex, input.attacker.owner, input.others),
    },
    defender: {
      strength: effectiveUnitStrength(
        input.defender.strength,
        input.defender.hp,
        input.defender.morale,
      ),
      hp: input.defender.hp,
      abilities: input.defender.abilities,
      adjacentAllies: adjacentPhalangites(input.defender.hex, input.defender.owner, input.others),
    },
    defenderTerrainDefense: input.defenderTerrainDefense,
    defenderTerrainMoveCost: input.defenderTerrainMoveCost,
    flanked,
    riverAttack: input.ranged === true ? false : input.riverAttack,
    ranged: input.ranged === true,
    defenderFortifyBonus: fortifyStrengthBonus(input.defender.fortifiedTurns),
    rng: input.rng,
  });
}
