import { clampLoyalty, factionPolarity } from "./cities";
import type { MatchState } from "./state";

export const INCITE_PRESSURE = 5;

export function canIncite(state: MatchState, faction: string): boolean {
  return state.activeFaction === faction && state.incitedThisTurn !== true;
}

export function applyIncite(state: MatchState, faction: string, cityId: string): MatchState | null {
  if (!canIncite(state, faction)) return null;
  const delta = INCITE_PRESSURE * factionPolarity(faction);
  if (delta === 0) return null;
  const city = state.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return null;
  const cities = state.cities.map((candidate) =>
    candidate.id === cityId
      ? { ...candidate, loyalty: clampLoyalty((candidate.loyalty ?? 0) + delta) }
      : candidate,
  );
  return { ...state, cities, incitedThisTurn: true };
}
