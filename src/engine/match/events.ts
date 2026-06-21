import type { Hex } from "../hex";
import type { Unit } from "../unit/types";

export interface MoveEvent {
  readonly kind: "move";
  readonly seq: number;
  readonly turn: number;
  readonly faction: string;
  readonly unitId: string;
  readonly unitTypeId: string;
  readonly from: Hex;
  readonly to: Hex;
}

export interface AttackEvent {
  readonly kind: "attack";
  readonly seq: number;
  readonly turn: number;
  readonly faction: string;
  readonly unitId: string;
  readonly unitTypeId: string;
  readonly attackerHex: Hex;
  readonly targetId: string;
  readonly targetTypeId: string;
  readonly targetHex: Hex;
  readonly attackerDamage: number;
  readonly defenderDamage: number;
  readonly defeated: readonly string[];
}

export interface CityAttackEvent {
  readonly kind: "cityAttack";
  readonly seq: number;
  readonly turn: number;
  readonly faction: string;
  readonly unitId: string;
  readonly unitTypeId: string;
  readonly cityId: string;
  readonly cityDamage: number;
  readonly retaliation: number;
  readonly cityFell: boolean;
}

export interface CaptureEvent {
  readonly kind: "capture";
  readonly seq: number;
  readonly turn: number;
  readonly faction: string;
  readonly unitId: string;
  readonly unitTypeId: string;
  readonly cityId: string;
  readonly previousOwner: string | null;
}

export interface DefectionEvent {
  readonly kind: "defection";
  readonly seq: number;
  readonly turn: number;
  readonly faction: string;
  readonly cityId: string;
  readonly hex: Hex;
  readonly previousOwner: string | null;
}

export type MatchEvent = MoveEvent | AttackEvent | CityAttackEvent | CaptureEvent | DefectionEvent;

export interface AttackOutcomeSummary {
  readonly attackerDamage: number;
  readonly defenderDamage: number;
  readonly defeated: readonly string[];
}

export interface CityAttackOutcomeSummary {
  readonly cityDamage: number;
  readonly attackerDamage: number;
  readonly cityFell: boolean;
}

export function appendMove(
  events: readonly MatchEvent[],
  turn: number,
  unit: Unit,
  from: Hex,
  to: Hex,
): readonly MatchEvent[] {
  return [
    ...events,
    {
      kind: "move",
      seq: events.length,
      turn,
      faction: unit.owner,
      unitId: unit.id,
      unitTypeId: unit.typeId,
      from,
      to,
    },
  ];
}

export function appendAttack(
  events: readonly MatchEvent[],
  turn: number,
  attacker: Unit,
  defender: Unit,
  outcome: AttackOutcomeSummary,
): readonly MatchEvent[] {
  return [
    ...events,
    {
      kind: "attack",
      seq: events.length,
      turn,
      faction: attacker.owner,
      unitId: attacker.id,
      unitTypeId: attacker.typeId,
      attackerHex: attacker.hex,
      targetId: defender.id,
      targetTypeId: defender.typeId,
      targetHex: defender.hex,
      attackerDamage: outcome.attackerDamage,
      defenderDamage: outcome.defenderDamage,
      defeated: outcome.defeated,
    },
  ];
}

export function appendCityAttack(
  events: readonly MatchEvent[],
  turn: number,
  attacker: Unit,
  cityId: string,
  outcome: CityAttackOutcomeSummary,
): readonly MatchEvent[] {
  return [
    ...events,
    {
      kind: "cityAttack",
      seq: events.length,
      turn,
      faction: attacker.owner,
      unitId: attacker.id,
      unitTypeId: attacker.typeId,
      cityId,
      cityDamage: outcome.cityDamage,
      retaliation: outcome.attackerDamage,
      cityFell: outcome.cityFell,
    },
  ];
}

export function appendCapture(
  events: readonly MatchEvent[],
  turn: number,
  unit: Unit,
  cityId: string,
  previousOwner: string | null,
): readonly MatchEvent[] {
  return [
    ...events,
    {
      kind: "capture",
      seq: events.length,
      turn,
      faction: unit.owner,
      unitId: unit.id,
      unitTypeId: unit.typeId,
      cityId,
      previousOwner,
    },
  ];
}

export function appendDefection(
  events: readonly MatchEvent[],
  turn: number,
  cityId: string,
  hex: Hex,
  newOwner: string,
  previousOwner: string | null,
): readonly MatchEvent[] {
  return [
    ...events,
    {
      kind: "defection",
      seq: events.length,
      turn,
      faction: newOwner,
      cityId,
      hex,
      previousOwner,
    },
  ];
}
