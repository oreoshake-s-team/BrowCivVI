import { hexDistance } from "../hex";
import type { Hex } from "../hex";
import { canCityStrike, type CityState } from "../match/cities";
import type { Rng } from "../rng";
import { unitTypeById } from "../unit/catalog";
import type { Unit } from "../unit/types";
import { effectiveUnitStrength, resolveCombat } from "./resolveCombat";

export function cityStrikeTargets(
  city: CityState,
  cityHex: Hex,
  units: readonly Unit[],
): readonly Unit[] {
  if (!canCityStrike(city)) return [];
  return units.filter((unit) => unit.owner !== city.owner && hexDistance(cityHex, unit.hex) === 1);
}

export interface ApplyCityStrikeInput {
  readonly units: readonly Unit[];
  readonly cities: readonly CityState[];
  readonly cityId: string;
  readonly cityHex: Hex;
  readonly cityStrength: number;
  readonly targetId: string;
  readonly targetTerrainDefense: number;
  readonly targetTerrainMoveCost: number;
  readonly rng: Rng;
}

export interface CityStrikeApplication {
  readonly units: readonly Unit[];
  readonly cities: readonly CityState[];
  readonly damage: number;
  readonly defeated: boolean;
}

export function applyCityStrike(input: ApplyCityStrikeInput): CityStrikeApplication {
  const city = input.cities.find((candidate) => candidate.id === input.cityId);
  const target = input.units.find((unit) => unit.id === input.targetId);
  if (
    city === undefined ||
    target === undefined ||
    !canCityStrike(city) ||
    hexDistance(input.cityHex, target.hex) !== 1 ||
    target.owner === city.owner
  ) {
    return { units: input.units, cities: input.cities, damage: 0, defeated: false };
  }

  const targetType = unitTypeById(target.typeId);
  const result = resolveCombat({
    attacker: { strength: input.cityStrength, hp: city.hp, abilities: [], adjacentAllies: 0 },
    defender: {
      strength: effectiveUnitStrength(targetType?.strength ?? 0, target.hp, target.morale),
      hp: target.hp,
      abilities: targetType?.abilities ?? [],
      adjacentAllies: 0,
    },
    defenderTerrainDefense: input.targetTerrainDefense,
    defenderTerrainMoveCost: input.targetTerrainMoveCost,
    flanked: false,
    riverAttack: false,
    ranged: true,
    rng: input.rng,
  });

  const units = input.units
    .map((unit) =>
      unit.id === input.targetId ? { ...unit, hp: unit.hp - result.defenderDamage } : unit,
    )
    .filter((unit) => unit.hp > 0);
  const defeated = !units.some((unit) => unit.id === input.targetId);
  const cities = input.cities.map((candidate) =>
    candidate.id === input.cityId ? { ...candidate, struckThisTurn: true } : candidate,
  );

  return { units, cities, damage: result.defenderDamage, defeated };
}
