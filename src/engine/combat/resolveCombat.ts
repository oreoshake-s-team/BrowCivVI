import type { Rng } from "../rng";
import { phalanxAdjacencyMultiplier } from "./phalanx";
import { aggregateDefenseMultiplier } from "./registry";

export const COMBAT_BASE_DAMAGE = 30;
export const COMBAT_STRENGTH_SCALE = 0.04;
export const COMBAT_VARIANCE = 0.25;
export const FLANK_ATTACK_BONUS = 0.5;
export const RIVER_ATTACK_PENALTY = 5;

export interface CombatSide {
  readonly strength: number;
  readonly hp: number;
  readonly abilities: readonly string[];
  readonly adjacentAllies: number;
}

export interface CombatInput {
  readonly attacker: CombatSide;
  readonly defender: CombatSide;
  readonly defenderTerrainDefense: number;
  readonly defenderTerrainMoveCost: number;
  readonly flanked: boolean;
  readonly riverAttack: boolean;
  readonly rng: Rng;
}

export interface CombatResult {
  readonly defenderDamage: number;
  readonly attackerDamage: number;
  readonly defenderDefeated: boolean;
  readonly attackerDefeated: boolean;
}

function variance(rng: Rng): number {
  return 1 - COMBAT_VARIANCE + rng() * (2 * COMBAT_VARIANCE);
}

function damage(attackerStrength: number, defenderStrength: number, rng: Rng): number {
  const scaled =
    COMBAT_BASE_DAMAGE * Math.exp(COMBAT_STRENGTH_SCALE * (attackerStrength - defenderStrength));
  return Math.max(1, Math.round(scaled * variance(rng)));
}

export function resolveCombat(input: CombatInput): CombatResult {
  const attackerStrength = Math.max(
    1,
    input.attacker.strength *
      phalanxAdjacencyMultiplier(input.attacker.abilities, input.attacker.adjacentAllies) *
      (1 + (input.flanked ? FLANK_ATTACK_BONUS : 0)) -
      (input.riverAttack ? RIVER_ATTACK_PENALTY : 0),
  );

  const defenseMultiplier =
    aggregateDefenseMultiplier({
      defenderAbilities: input.defender.abilities,
      flanked: input.flanked,
      terrainMoveCost: input.defenderTerrainMoveCost,
    }) *
    phalanxAdjacencyMultiplier(input.defender.abilities, input.defender.adjacentAllies) *
    (1 + input.defenderTerrainDefense);
  const defenderStrength = input.defender.strength * defenseMultiplier;

  const defenderDamage = Math.min(
    damage(attackerStrength, defenderStrength, input.rng),
    input.defender.hp,
  );
  const attackerDamage = Math.min(
    damage(defenderStrength, attackerStrength, input.rng),
    input.attacker.hp,
  );

  return {
    defenderDamage,
    attackerDamage,
    defenderDefeated: defenderDamage >= input.defender.hp,
    attackerDefeated: attackerDamage >= input.attacker.hp,
  };
}
