import type { Hex } from "../hex";
import type { City, GameMap } from "../map/types";
import { hexKey } from "../map/types";

export interface CityState {
  readonly id: string;
  readonly owner: string | null;
  readonly hp: number;
  readonly loyalty?: number;
  readonly attackedThisTurn?: boolean;
  readonly sacked?: boolean;
}

export const CITY_HP_PER_DEFENSE = 8;
export const CITY_CAPTURE_HP_FRACTION = 0.5;
export const CITY_HEAL_RATE = 20;

export const LOYALTY_MIN = -100;
export const LOYALTY_MAX = 100;
export const LOYALTY_OWNER_SEED = 50;
export const LOYALTY_AFFINITY_SEED = 30;

export function cityMaxHp(defense: number): number {
  return defense * CITY_HP_PER_DEFENSE;
}

export function clampLoyalty(value: number): number {
  return Math.max(LOYALTY_MIN, Math.min(LOYALTY_MAX, value));
}

export function factionPolarity(faction: string | null | undefined): number {
  if (faction === "macedon") return 1;
  if (faction === "persia") return -1;
  return 0;
}

function seedLoyalty(city: City): number {
  return clampLoyalty(
    LOYALTY_OWNER_SEED * factionPolarity(city.owner) +
      LOYALTY_AFFINITY_SEED * factionPolarity(city.affinity),
  );
}

export function healCities(
  cities: readonly CityState[],
  faction: string,
  maxHpOf: (cityId: string) => number,
): readonly CityState[] {
  return cities.map((city) => {
    if (city.owner !== faction) return city;
    if (city.attackedThisTurn === true) return { ...city, attackedThisTurn: false };
    const healed = Math.min(maxHpOf(city.id), city.hp + CITY_HEAL_RATE);
    return healed === city.hp ? city : { ...city, hp: healed };
  });
}

export function matchLacksCityState(cities: readonly CityState[], mapHasCities: boolean): boolean {
  return cities.length === 0 && mapHasCities;
}

export function seedCities(cities: readonly City[]): readonly CityState[] {
  return cities.map((city) => ({
    id: city.id,
    owner: city.owner,
    hp: cityMaxHp(city.defense),
    loyalty: seedLoyalty(city),
  }));
}

export function blockingCityHexes(
  cities: readonly CityState[],
  map: GameMap,
  mover: string,
): ReadonlySet<string> {
  const blocked = new Set<string>();
  for (const city of cities) {
    if (city.owner === mover || city.hp <= 0) continue;
    const hex = map.cities.get(city.id)?.hex;
    if (hex !== undefined) blocked.add(hexKey(hex));
  }
  return blocked;
}

export interface CaptureResult {
  readonly cities: readonly CityState[];
  readonly captured: { readonly cityId: string; readonly previousOwner: string | null } | null;
}

export function captureCityAt(
  cities: readonly CityState[],
  map: GameMap,
  hex: Hex,
  capturer: string,
): CaptureResult {
  const cityId = map.hexes.get(hexKey(hex))?.cityId;
  if (cityId === undefined) return { cities, captured: null };
  const city = cities.find((candidate) => candidate.id === cityId);
  if (city === undefined || city.owner === capturer || city.hp > 0)
    return { cities, captured: null };
  const defense = map.cities.get(cityId)?.defense ?? 0;
  const resetHp = Math.max(1, Math.round(cityMaxHp(defense) * CITY_CAPTURE_HP_FRACTION));
  return {
    cities: cities.map((candidate) =>
      candidate.id === cityId
        ? { ...candidate, owner: capturer, hp: resetHp, sacked: true }
        : candidate,
    ),
    captured: { cityId, previousOwner: city.owner },
  };
}
