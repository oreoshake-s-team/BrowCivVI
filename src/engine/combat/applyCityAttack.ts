import type { CityState } from "../match/cities";
import type { Rng } from "../rng";
import { unitTypeById } from "../unit/catalog";
import type { Unit } from "../unit/types";
import { resolveCombat } from "./resolveCombat";

export interface ApplyCityAttackInput {
  readonly units: readonly Unit[];
  readonly cities: readonly CityState[];
  readonly movement: Readonly<Record<string, number>>;
  readonly attackerId: string;
  readonly cityId: string;
  readonly cityDefense: number;
  readonly cityTerrainDefense: number;
  readonly cityTerrainMoveCost: number;
  readonly riverAttack: boolean;
  readonly rng: Rng;
}

export interface CityAttackApplication {
  readonly units: readonly Unit[];
  readonly cities: readonly CityState[];
  readonly movement: Readonly<Record<string, number>>;
  readonly attackerDamage: number;
  readonly cityDamage: number;
  readonly cityFell: boolean;
  readonly defeated: readonly string[];
}

export function applyCityAttack(input: ApplyCityAttackInput): CityAttackApplication {
  const attacker = input.units.find((unit) => unit.id === input.attackerId);
  const city = input.cities.find((candidate) => candidate.id === input.cityId);
  if (attacker === undefined || city === undefined) {
    return {
      units: input.units,
      cities: input.cities,
      movement: input.movement,
      attackerDamage: 0,
      cityDamage: 0,
      cityFell: false,
      defeated: [],
    };
  }

  const attackerType = unitTypeById(attacker.typeId);
  const result = resolveCombat({
    attacker: {
      strength: attackerType?.strength ?? 0,
      hp: attacker.hp,
      abilities: attackerType?.abilities ?? [],
      adjacentAllies: 0,
    },
    defender: { strength: input.cityDefense, hp: city.hp, abilities: [], adjacentAllies: 0 },
    defenderTerrainDefense: input.cityTerrainDefense,
    defenderTerrainMoveCost: input.cityTerrainMoveCost,
    flanked: false,
    riverAttack: input.riverAttack,
    rng: input.rng,
  });

  const cities = input.cities.map((candidate) =>
    candidate.id === input.cityId
      ? { ...candidate, hp: Math.max(0, candidate.hp - result.defenderDamage) }
      : candidate,
  );

  const units = input.units
    .map((unit) =>
      unit.id === input.attackerId
        ? { ...unit, hp: unit.hp - result.attackerDamage, hasAttackedThisTurn: true }
        : unit,
    )
    .filter((unit) => unit.hp > 0);

  const defeated = units.some((unit) => unit.id === input.attackerId) ? [] : [input.attackerId];

  return {
    units,
    cities,
    movement: { ...input.movement, [input.attackerId]: 0 },
    attackerDamage: result.attackerDamage,
    cityDamage: result.defenderDamage,
    cityFell: result.defenderDefeated,
    defeated,
  };
}
