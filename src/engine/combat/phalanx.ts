import type { CombatArc } from "./arcs";

export const PHALANX_ABILITY = "phalanx";
export const PHALANX_FRONT_BONUS = 0.5;
export const PHALANX_ROUGH_PENALTY = 0.25;
export const ROUGH_MOVE_COST_THRESHOLD = 1;

export interface PhalanxDefenseInput {
  readonly defenderAbilities: readonly string[];
  readonly arc: CombatArc;
  readonly terrainMoveCost: number;
}

export function phalanxDefenseMultiplier(input: PhalanxDefenseInput): number {
  if (!input.defenderAbilities.includes(PHALANX_ABILITY)) return 1;
  let multiplier = input.arc === "front" ? 1 + PHALANX_FRONT_BONUS : 1;
  if (input.terrainMoveCost > ROUGH_MOVE_COST_THRESHOLD) {
    multiplier *= 1 - PHALANX_ROUGH_PENALTY;
  }
  return multiplier;
}
