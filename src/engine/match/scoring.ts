import type { CityState } from "./cities";
import type { MatchState } from "./state";

export const CITY_SACKED_VALUE_FRACTION = 0.6;

export function cityScore(
  cities: readonly CityState[],
  faction: string,
  valueOf: (cityId: string) => number,
): number {
  let total = 0;
  for (const city of cities) {
    if (city.owner !== faction) continue;
    total += valueOf(city.id) * (city.sacked === true ? CITY_SACKED_VALUE_FRACTION : 1);
  }
  return Math.round(total);
}

export function matchCityScores(
  state: MatchState,
  valueOf: (cityId: string) => number,
): Readonly<Record<string, number>> {
  const scores: Record<string, number> = {};
  for (const faction of state.turnOrder) {
    scores[faction] = cityScore(state.cities, faction, valueOf);
  }
  return scores;
}
