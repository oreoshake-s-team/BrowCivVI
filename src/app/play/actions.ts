"use server";

import { cookies } from "next/headers";
import { FIRST_SLICE_MAP, FIRST_SLICE_PLAYER_FACTION } from "@/content/firstSlice";
import { applyAttack } from "@/engine/combat/applyAttack";
import { attackableHexes } from "@/engine/combat/targets";
import type { Hex } from "@/engine/hex";
import { hexKey, terrainAt } from "@/engine/map/types";
import type { MatchState } from "@/engine/match/state";
import { StaleMatchError } from "@/engine/match/store";
import { availableMoves, resolveMove } from "@/engine/movement/resolveMove";
import { createRng } from "@/engine/rng";
import { unitTypeById } from "@/engine/unit/catalog";
import type { MovementDomain } from "@/engine/unit/classes";
import { domainForClass } from "@/engine/unit/classes";
import type { Unit } from "@/engine/unit/types";
import { IDENTITY_COOKIE, signIdentity, verifyIdentity, newIdentityId } from "@/server/identity";
import { getOrCreateDefault, createNewMatch, loadOwned } from "@/server/matchService";
import { getStore } from "@/server/store";

export interface BoardView {
  readonly matchId: string;
  readonly units: readonly Unit[];
  readonly movement: Readonly<Record<string, number>>;
  readonly playerFaction: string;
}

export interface MoveOutcome {
  readonly ok: boolean;
  readonly units: readonly Unit[];
  readonly reachable: readonly Hex[];
  readonly movement: Readonly<Record<string, number>>;
}

async function currentOwner(): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(IDENTITY_COOKIE)?.value;
  const existing = raw === undefined ? null : verifyIdentity(raw);
  if (existing !== null) return existing;
  const id = newIdentityId();
  jar.set(IDENTITY_COOKIE, signIdentity(id), { httpOnly: true, sameSite: "lax", path: "/" });
  return id;
}

function domainOf(typeId: string): MovementDomain {
  const type = unitTypeById(typeId);
  return type ? domainForClass(type.class) : "land";
}

function occupiedExcept(match: MatchState, unitId: string): ReadonlySet<string> {
  return new Set(match.units.filter((unit) => unit.id !== unitId).map((unit) => hexKey(unit.hex)));
}

function reachableForUnit(match: MatchState, unit: Unit): readonly Hex[] {
  return availableMoves({
    from: unit.hex,
    movement: match.movement[unit.id] ?? 0,
    domain: domainOf(unit.typeId),
    map: FIRST_SLICE_MAP,
    blocked: occupiedExcept(match, unit.id),
  });
}

async function resolveMatch(matchId?: string): Promise<MatchState> {
  const owner = await currentOwner();
  const store = getStore();
  if (matchId !== undefined) {
    const owned = await loadOwned(store, owner, matchId);
    if (owned !== null) return owned;
  }
  return getOrCreateDefault(store, owner);
}

function boardView(match: MatchState): BoardView {
  return {
    matchId: match.id,
    units: match.units,
    movement: match.movement,
    playerFaction: FIRST_SLICE_PLAYER_FACTION,
  };
}

export async function loadBoard(matchId?: string): Promise<BoardView> {
  return boardView(await resolveMatch(matchId));
}

export async function newGame(): Promise<BoardView> {
  return boardView(await createNewMatch(getStore(), await currentOwner()));
}

export async function reachableFor(matchId: string, unitId: string): Promise<readonly Hex[]> {
  const match = await resolveMatch(matchId);
  const unit = match.units.find((candidate) => candidate.id === unitId);
  return unit === undefined ? [] : reachableForUnit(match, unit);
}

export async function move(matchId: string, unitId: string, to: Hex): Promise<MoveOutcome> {
  const owner = await currentOwner();
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return { ok: false, units: [], reachable: [], movement: {} };

  const unit = match.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined)
    return { ok: false, units: match.units, reachable: [], movement: match.movement };

  const result = resolveMove({
    unitId,
    from: unit.hex,
    to,
    movement: match.movement[unitId] ?? 0,
    domain: domainOf(unit.typeId),
    map: FIRST_SLICE_MAP,
    blocked: occupiedExcept(match, unitId),
  });
  if (!result.ok)
    return {
      ok: false,
      units: match.units,
      reachable: reachableForUnit(match, unit),
      movement: match.movement,
    };

  const next: MatchState = {
    ...match,
    units: match.units.map((u) => (u.id === unitId ? { ...u, hex: result.hex } : u)),
    movement: { ...match.movement, [unitId]: result.remaining },
  };

  try {
    const saved = await store.save(next);
    const movedUnit = saved.units.find((candidate) => candidate.id === unitId);
    return {
      ok: true,
      units: saved.units,
      reachable: movedUnit === undefined ? [] : reachableForUnit(saved, movedUnit),
      movement: saved.movement,
    };
  } catch (error) {
    if (error instanceof StaleMatchError) {
      return {
        ok: false,
        units: match.units,
        reachable: reachableForUnit(match, unit),
        movement: match.movement,
      };
    }
    throw error;
  }
}

export interface SelectionTargets {
  readonly reachable: readonly Hex[];
  readonly attackable: readonly Hex[];
}

export interface AttackOutcome {
  readonly ok: boolean;
  readonly units: readonly Unit[];
  readonly attackerHex?: Hex;
  readonly defenderHex?: Hex;
  readonly attackerDamage?: number;
  readonly defenderDamage?: number;
  readonly defeated?: readonly string[];
  readonly movement?: Readonly<Record<string, number>>;
}

export async function targetsFor(matchId: string, unitId: string): Promise<SelectionTargets> {
  const match = await resolveMatch(matchId);
  const unit = match.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return { reachable: [], attackable: [] };
  return {
    reachable: reachableForUnit(match, unit),
    attackable: attackableHexes(match.units, unitId),
  };
}

export async function attack(
  matchId: string,
  attackerId: string,
  targetId: string,
): Promise<AttackOutcome> {
  const owner = await currentOwner();
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return { ok: false, units: [] };

  const attacker = match.units.find((u) => u.id === attackerId);
  const defender = match.units.find((u) => u.id === targetId);
  if (attacker === undefined || defender === undefined || attacker.owner === defender.owner) {
    return { ok: false, units: match.units };
  }
  if (
    !attackableHexes(match.units, attackerId).some((hex) => hexKey(hex) === hexKey(defender.hex))
  ) {
    return { ok: false, units: match.units };
  }

  const terrain = terrainAt(FIRST_SLICE_MAP, defender.hex);
  const application = applyAttack({
    units: match.units,
    movement: match.movement,
    attackerId,
    defenderId: targetId,
    defenderTerrainDefense: terrain?.defenseModifier ?? 0,
    defenderTerrainMoveCost: terrain?.moveCost ?? 1,
    rng: createRng((match.seed ^ (match.version + 1)) >>> 0),
  });

  try {
    const saved = await store.save({
      ...match,
      units: application.units,
      movement: application.movement,
    });
    return {
      ok: true,
      units: saved.units,
      attackerHex: attacker.hex,
      defenderHex: defender.hex,
      attackerDamage: application.attackerDamage,
      defenderDamage: application.defenderDamage,
      defeated: application.defeated,
      movement: saved.movement,
    };
  } catch (error) {
    if (error instanceof StaleMatchError) return { ok: false, units: match.units };
    throw error;
  }
}
