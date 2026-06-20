import type { City } from "../map/types";

export interface CityState {
  readonly id: string;
  readonly owner: string | null;
  readonly hp: number;
}

export const CITY_HP_PER_DEFENSE = 8;

export function cityMaxHp(defense: number): number {
  return defense * CITY_HP_PER_DEFENSE;
}

export function seedCities(cities: readonly City[]): readonly CityState[] {
  return cities.map((city) => ({
    id: city.id,
    owner: city.owner,
    hp: cityMaxHp(city.defense),
  }));
}
