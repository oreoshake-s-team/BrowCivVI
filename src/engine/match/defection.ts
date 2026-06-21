import { neighbors } from "../hex";
import { hexKey } from "../map/types";
import { LOYALTY_DEFECT_THRESHOLD, type CityState } from "./cities";
import type { LoyaltyContext } from "./loyalty";
import type { MatchState } from "./state";

function defectionTarget(city: CityState): string | null {
  const loyalty = city.loyalty ?? 0;
  if (loyalty >= LOYALTY_DEFECT_THRESHOLD) return "macedon";
  if (loyalty <= -LOYALTY_DEFECT_THRESHOLD) return "persia";
  return null;
}

function underThreat(
  state: MatchState,
  ctx: LoyaltyContext,
  cityId: string,
  target: string,
): boolean {
  const mapCity = ctx.map.cities.get(cityId);
  if (mapCity === undefined) return false;
  const cells = new Set([hexKey(mapCity.hex), ...neighbors(mapCity.hex).map(hexKey)]);
  return state.units.some(
    (unit) => ctx.isMilitary(unit.typeId) && unit.owner !== target && cells.has(hexKey(unit.hex)),
  );
}

function nextCity(state: MatchState, ctx: LoyaltyContext, city: CityState): CityState {
  const target = defectionTarget(city);
  const qualifies =
    target !== null && target !== city.owner && !underThreat(state, ctx, city.id, target);
  if (!qualifies) return city.defecting === true ? { ...city, defecting: false } : city;
  if (city.defecting === true) {
    return { ...city, owner: target, defecting: false, sacked: false };
  }
  return { ...city, defecting: true };
}

export function applyDefections(state: MatchState, ctx: LoyaltyContext): MatchState {
  const cities = state.cities.map((city) => nextCity(state, ctx, city));
  const changed = cities.some((city, index) => city !== state.cities[index]);
  return changed ? { ...state, cities } : state;
}
