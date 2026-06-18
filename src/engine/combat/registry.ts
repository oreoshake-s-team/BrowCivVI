import type { PhalanxDefenseInput } from "./phalanx";
import { phalanxDefenseMultiplier, PHALANX_ABILITY } from "./phalanx";

export type DefenseModifierContext = PhalanxDefenseInput;

export type DefenseModifier = (ctx: DefenseModifierContext) => number;

export const defenseModifierRegistry: Readonly<Record<string, DefenseModifier>> = {
  [PHALANX_ABILITY]: (ctx) => phalanxDefenseMultiplier(ctx),
};

export function aggregateDefenseMultiplier(ctx: DefenseModifierContext): number {
  return ctx.defenderAbilities.reduce<number>((acc, ability) => {
    const modifier = defenseModifierRegistry[ability];
    return modifier ? acc * modifier(ctx) : acc;
  }, 1);
}
