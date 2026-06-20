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
  readonly targetId: string;
  readonly targetTypeId: string;
  readonly targetHex: Hex;
  readonly attackerDamage: number;
  readonly defenderDamage: number;
  readonly defeated: readonly string[];
}

export type MatchEvent = MoveEvent | AttackEvent;

export interface AttackOutcomeSummary {
  readonly attackerDamage: number;
  readonly defenderDamage: number;
  readonly defeated: readonly string[];
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
      targetId: defender.id,
      targetTypeId: defender.typeId,
      targetHex: defender.hex,
      attackerDamage: outcome.attackerDamage,
      defenderDamage: outcome.defenderDamage,
      defeated: outcome.defeated,
    },
  ];
}
