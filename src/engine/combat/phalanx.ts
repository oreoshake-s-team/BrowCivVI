export const PHALANX_ABILITY = "phalanx";
export const PHALANX_WALL_BONUS = 0.5;
export const PHALANX_ROUGH_PENALTY = 0.25;
export const ROUGH_MOVE_COST_THRESHOLD = 1;

export interface PhalanxDefenseInput {
  readonly defenderAbilities: readonly string[];
  readonly flanked: boolean;
  readonly terrainMoveCost: number;
}

export function phalanxDefenseMultiplier(input: PhalanxDefenseInput): number {
  if (!input.defenderAbilities.includes(PHALANX_ABILITY)) return 1;
  let multiplier = input.flanked ? 1 : 1 + PHALANX_WALL_BONUS;
  if (input.terrainMoveCost > ROUGH_MOVE_COST_THRESHOLD) {
    multiplier *= 1 - PHALANX_ROUGH_PENALTY;
  }
  return multiplier;
}
