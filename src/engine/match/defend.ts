import { MAX_FORTIFY_TURNS } from "../combat/fortify";
import type { Unit } from "../unit/types";
import type { MatchState } from "./state";

function hasActed(unit: Unit): boolean {
  return unit.hasMovedThisTurn || unit.hasAttackedThisTurn === true;
}

export function applyDefend(state: MatchState, faction: string, unitId: string): MatchState | null {
  if (state.activeFaction !== faction) return null;
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (unit?.owner !== faction || hasActed(unit)) return null;
  const level = Math.max(unit.fortifiedTurns ?? 0, 1);
  return {
    ...state,
    units: state.units.map((candidate) =>
      candidate.id === unitId ? { ...candidate, fortifiedTurns: level } : candidate,
    ),
    movement: { ...state.movement, [unitId]: 0 },
  };
}

export function rampFortify(units: readonly Unit[], faction: string): readonly Unit[] {
  return units.map((unit) => {
    if (unit.owner !== faction || (unit.fortifiedTurns ?? 0) < 1) return unit;
    const next = Math.min(MAX_FORTIFY_TURNS, (unit.fortifiedTurns ?? 0) + 1);
    return next === unit.fortifiedTurns ? unit : { ...unit, fortifiedTurns: next };
  });
}
