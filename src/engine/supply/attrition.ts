import type { MatchState } from "../match/state";
import type { Unit } from "../unit/types";

export const OUT_OF_SUPPLY_FIRST = 10;
export const OUT_OF_SUPPLY_STEP = 5;
export const OUT_OF_SUPPLY_CAP = 25;
export const OUT_OF_SUPPLY_MORALE = 5;
export const MIN_HP = 1;

export function attritionRate(outOfSupplyTurns: number): number {
  if (outOfSupplyTurns <= 0) return 0;
  return Math.min(
    OUT_OF_SUPPLY_CAP,
    OUT_OF_SUPPLY_FIRST + OUT_OF_SUPPLY_STEP * (outOfSupplyTurns - 1),
  );
}

function attritUnit(unit: Unit): Unit {
  if (unit.supplied) {
    return (unit.outOfSupplyTurns ?? 0) === 0 ? unit : { ...unit, outOfSupplyTurns: 0 };
  }
  const turns = (unit.outOfSupplyTurns ?? 0) + 1;
  return {
    ...unit,
    outOfSupplyTurns: turns,
    hp: Math.max(MIN_HP, unit.hp - attritionRate(turns)),
    morale: Math.max(0, unit.morale - OUT_OF_SUPPLY_MORALE),
  };
}

export function applyOutOfSupplyAttrition(state: MatchState, faction: string): MatchState {
  return {
    ...state,
    units: state.units.map((unit) => (unit.owner === faction ? attritUnit(unit) : unit)),
  };
}
