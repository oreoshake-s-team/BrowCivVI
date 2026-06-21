import type { Hex } from "../hex";
import type { City, GameMap } from "../map/types";
import { hexKey } from "../map/types";

export interface CityState {
  readonly id: string;
  readonly owner: string | null;
  readonly hp: number;
  readonly attackedThisTurn?: boolean;
  readonly sacked?: boolean;
}

export const CITY_HP_PER_DEFENSE = 8;
export const CITY_CAPTURE_HP_FRACTION = 0.5;
export const CITY_HEAL_RATE = 20;

export function cityMaxHp(defense: number): number {
  return defense * CITY_HP_PER_DEFENSE;
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

export function seedCities(cities: readonly City[]): readonly CityState[] {
  return cities.map((city) => ({
    id: city.id,
    owner: city.owner,
    hp: cityMaxHp(city.defense),
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
