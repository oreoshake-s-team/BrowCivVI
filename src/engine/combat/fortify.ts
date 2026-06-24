export const FORTIFY_LEVEL_1_BONUS = 3;
export const FORTIFY_LEVEL_2_BONUS = 6;
export const MAX_FORTIFY_TURNS = 2;

export function fortifyStrengthBonus(fortifiedTurns: number | undefined): number {
  if (fortifiedTurns === undefined || fortifiedTurns <= 0) return 0;
  return fortifiedTurns >= MAX_FORTIFY_TURNS ? FORTIFY_LEVEL_2_BONUS : FORTIFY_LEVEL_1_BONUS;
}
