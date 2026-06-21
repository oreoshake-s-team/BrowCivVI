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

export const STREAK_MAX = 5;
export const STREAK_RAMP = 0.5;
export const STREAK_MULTIPLIER_MAX = 3;
export const STREAK_DECAY = 1;

export interface LoyaltyContext {
  readonly map: GameMap;
  readonly isMilitary: (typeId: string) => boolean;
}

interface LoyaltyOutcome {
  readonly loyalty: number;
  readonly streak: number;
}

function clampStreak(value: number): number {
  return Math.max(-STREAK_MAX, Math.min(STREAK_MAX, value));
}

function decayToZero(value: number, by: number): number {
  if (value > 0) return Math.max(0, value - by);
  if (value < 0) return Math.min(0, value + by);
  return 0;
}

function streakMultiplier(alignedStreak: number): number {
  return Math.min(STREAK_MULTIPLIER_MAX, 1 + STREAK_RAMP * alignedStreak);
}

function militaryNet(state: MatchState, ctx: LoyaltyContext, cells: ReadonlySet<string>): number {
  let net = 0;
  for (const unit of state.units) {
    if (!ctx.isMilitary(unit.typeId)) continue;
    if (cells.has(hexKey(unit.hex))) net += factionPolarity(unit.owner);
  }
  return net;
}

function nextLoyalty(state: MatchState, ctx: LoyaltyContext, city: CityState): LoyaltyOutcome {
  const loyalty = city.loyalty ?? 0;
  const streak = city.loyaltyStreak ?? 0;
  const mapCity = ctx.map.cities.get(city.id);
  if (mapCity === undefined) return { loyalty, streak };

  const cells = new Set([hexKey(mapCity.hex), ...neighbors(mapCity.hex).map(hexKey)]);
  const momentum = factionPolarity(city.owner);
  const proximity = Math.sign(militaryNet(state, ctx, cells));
  const affinity = factionPolarity(mapCity.affinity);
  const weighted =
    (MOMENTUM_WEIGHT * momentum + PROXIMITY_WEIGHT * proximity + AFFINITY_WEIGHT * affinity) /
    WEIGHT_TOTAL;
  const direction = Math.sign(weighted);

  if (direction === 0) return { loyalty, streak: decayToZero(streak, STREAK_DECAY) };

  const reinforcing = Math.sign(streak) === direction;
  const multiplier = streakMultiplier(reinforcing ? Math.abs(streak) : 0);
  const nextStreak =
    reinforcing || streak === 0
      ? clampStreak(streak + direction)
      : decayToZero(streak, STREAK_DECAY);
  return {
    loyalty: clampLoyalty(loyalty + Math.round(LOYALTY_STEP * weighted * multiplier)),
    streak: nextStreak,
  };
}

export function applyLoyaltyPressure(state: MatchState, ctx: LoyaltyContext): MatchState {
  const cities = state.cities.map((city) => {
    const next = nextLoyalty(state, ctx, city);
    if (next.loyalty === (city.loyalty ?? 0) && next.streak === (city.loyaltyStreak ?? 0))
      return city;
    return { ...city, loyalty: next.loyalty, loyaltyStreak: next.streak };
  });
  const changed = cities.some((city, index) => city !== state.cities[index]);
  return changed ? { ...state, cities } : state;
}
