import { neighbors } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey } from "../map/types";
import { clampLoyalty, factionPolarity, type CityState } from "./cities";
import type { MatchState } from "./state";

export const LOYALTY_STEP = 10;
export const MOMENTUM_WEIGHT = 50;
export const PROXIMITY_WEIGHT = 30;
export const AFFINITY_WEIGHT = 20;
const WEIGHT_TOTAL = MOMENTUM_WEIGHT + PROXIMITY_WEIGHT + AFFINITY_WEIGHT;

export interface LoyaltyContext {
  readonly map: GameMap;
  readonly isMilitary: (typeId: string) => boolean;
}

function militaryNet(state: MatchState, ctx: LoyaltyContext, cells: ReadonlySet<string>): number {
  let net = 0;
  for (const unit of state.units) {
    if (!ctx.isMilitary(unit.typeId)) continue;
    if (cells.has(hexKey(unit.hex))) net += factionPolarity(unit.owner);
  }
  return net;
}

function nextLoyalty(state: MatchState, ctx: LoyaltyContext, city: CityState): number {
  const mapCity = ctx.map.cities.get(city.id);
  if (mapCity === undefined) return city.loyalty ?? 0;
  const cells = new Set([hexKey(mapCity.hex), ...neighbors(mapCity.hex).map(hexKey)]);
  const momentum = factionPolarity(city.owner);
  const proximity = Math.sign(militaryNet(state, ctx, cells));
  const affinity = factionPolarity(mapCity.affinity);
  const weighted =
    (MOMENTUM_WEIGHT * momentum + PROXIMITY_WEIGHT * proximity + AFFINITY_WEIGHT * affinity) /
    WEIGHT_TOTAL;
  return clampLoyalty((city.loyalty ?? 0) + Math.round(LOYALTY_STEP * weighted));
}

export function applyLoyaltyPressure(state: MatchState, ctx: LoyaltyContext): MatchState {
  const cities = state.cities.map((city) => {
    const loyalty = nextLoyalty(state, ctx, city);
    return loyalty === (city.loyalty ?? 0) ? city : { ...city, loyalty };
  });
  const changed = cities.some((city, index) => city !== state.cities[index]);
  return changed ? { ...state, cities } : state;
}
