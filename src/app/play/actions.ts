"use server";

import { FIRST_SLICE_MAP, FIRST_SLICE_PLAYER_FACTION } from "@/content/firstSlice";
import { applyAttack } from "@/engine/combat/applyAttack";
import { reachableAttacks } from "@/engine/combat/targets";
import type { Hex } from "@/engine/hex";
import { hexKey, terrainAt } from "@/engine/map/types";
import type { MatchState } from "@/engine/match/state";
import { StaleMatchError } from "@/engine/match/store";
import { riverEdgeKey, riverEdgeSet } from "@/engine/movement/cost";
import { availableMoves, resolveMove } from "@/engine/movement/resolveMove";
import { enemyZoneOfControl } from "@/engine/movement/zoneOfControl";
import { createRng } from "@/engine/rng";
import { advanceTurn, type TurnContext } from "@/engine/turn/turn";
import { unitTypeById } from "@/engine/unit/catalog";
import type { MovementDomain, StackingLayer } from "@/engine/unit/classes";
import { domainForClass, stackingLayerForClass } from "@/engine/unit/classes";
import type { Unit } from "@/engine/unit/types";
import { getOrCreateDefault, createNewMatch, loadOwned } from "@/server/matchService";
import { intentAllowed } from "@/server/rateLimit";
import { ownerSubject } from "@/server/session";
import { getStore } from "@/server/store";

export interface BoardView {
  readonly matchId: string;
  readonly units: readonly Unit[];
  readonly movement: Readonly<Record<string, number>>;
  readonly playerFaction: string;
  readonly turn: number;
  readonly activeFaction: string;
}

export type LoadBoardResult =
  | { readonly status: "ok"; readonly board: BoardView }
  | { readonly status: "not-found" };

export interface MoveOutcome {
  readonly ok: boolean;
  readonly units: readonly Unit[];
  readonly reachable: readonly Hex[];
  readonly movement: Readonly<Record<string, number>>;
  readonly rateLimited?: boolean;
}

async function currentOwner(): Promise<string> {
  return ownerSubject();
}

function domainOf(typeId: string): MovementDomain {
  const type = unitTypeById(typeId);
  return type ? domainForClass(type.class) : "land";
}

function layerOf(typeId: string): StackingLayer {
  const type = unitTypeById(typeId);
  return type ? stackingLayerForClass(type.class) : "military";
}

interface MovementConstraints {
  readonly blocked: ReadonlySet<string>;
  readonly blockedDestinations: ReadonlySet<string>;
  readonly zoneOfControl: ReadonlySet<string>;
}

const RIVER_EDGES = riverEdgeSet(FIRST_SLICE_MAP.rivers);

function movementConstraints(match: MatchState, unit: Unit): MovementConstraints {
  const moverLayer = layerOf(unit.typeId);
  const blocked = new Set<string>();
  const blockedDestinations = new Set<string>();
  for (const other of match.units) {
    if (other.id === unit.id) continue;
    if (other.owner !== unit.owner) blocked.add(hexKey(other.hex));
    else if (layerOf(other.typeId) === moverLayer) blockedDestinations.add(hexKey(other.hex));
  }
  const zoneOfControl = enemyZoneOfControl(
    match.units,
    unit.owner,
    (typeId) => layerOf(typeId) === "military",
    RIVER_EDGES,
  );
  return { blocked, blockedDestinations, zoneOfControl };
}

function reachableForUnit(match: MatchState, unit: Unit): readonly Hex[] {
  const constraints = movementConstraints(match, unit);
  if (unit.hasMovedThisTurn && constraints.zoneOfControl.has(hexKey(unit.hex))) return [];
  return availableMoves({
    from: unit.hex,
    movement: match.movement[unit.id] ?? 0,
    domain: domainOf(unit.typeId),
    map: FIRST_SLICE_MAP,
    riverEdges: RIVER_EDGES,
    atFullMovement: !unit.hasMovedThisTurn,
    ...constraints,
  });
}

function attackTargets(match: MatchState, attacker: Unit): readonly Hex[] {
  return reachableAttacks(match.units, match.movement, attacker, FIRST_SLICE_MAP, RIVER_EDGES);
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
    turn: match.turn,
    activeFaction: match.activeFaction,
  };
}

const TURN_CONTEXT: TurnContext = {
  movementOf: (typeId) => unitTypeById(typeId)?.movement ?? 0,
};

export async function loadBoard(matchId?: string): Promise<LoadBoardResult> {
  const owner = await currentOwner();
  const store = getStore();
  if (matchId !== undefined) {
    const owned = await loadOwned(store, owner, matchId);
    return owned === null ? { status: "not-found" } : { status: "ok", board: boardView(owned) };
  }
  return { status: "ok", board: boardView(await getOrCreateDefault(store, owner)) };
}

export async function endTurn(matchId: string): Promise<BoardView> {
  const owner = await currentOwner();
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return boardView(await resolveMatch(matchId));
  if (match.activeFaction !== FIRST_SLICE_PLAYER_FACTION) return boardView(match);

  let next = advanceTurn(match, TURN_CONTEXT);
  let guard = match.turnOrder.length;
  while (next.activeFaction !== FIRST_SLICE_PLAYER_FACTION && guard-- > 0) {
    next = advanceTurn(next, TURN_CONTEXT);
  }

  try {
    return boardView(await store.save(next));
  } catch (error) {
    if (error instanceof StaleMatchError) return boardView(match);
    throw error;
  }
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
  if (!(await intentAllowed(owner)))
    return { ok: false, units: [], reachable: [], movement: {}, rateLimited: true };
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return { ok: false, units: [], reachable: [], movement: {} };

  const unit = match.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined)
    return { ok: false, units: match.units, reachable: [], movement: match.movement };

  const constraints = movementConstraints(match, unit);
  if (unit.hasMovedThisTurn && constraints.zoneOfControl.has(hexKey(unit.hex)))
    return {
      ok: false,
      units: match.units,
      reachable: reachableForUnit(match, unit),
      movement: match.movement,
    };

  const result = resolveMove({
    unitId,
    from: unit.hex,
    to,
    movement: match.movement[unitId] ?? 0,
    domain: domainOf(unit.typeId),
    map: FIRST_SLICE_MAP,
    riverEdges: RIVER_EDGES,
    atFullMovement: !unit.hasMovedThisTurn,
    ...constraints,
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
    units: match.units.map((u) =>
      u.id === unitId ? { ...u, hex: result.hex, hasMovedThisTurn: true } : u,
    ),
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
  readonly rateLimited?: boolean;
}

export async function targetsFor(matchId: string, unitId: string): Promise<SelectionTargets> {
  const match = await resolveMatch(matchId);
  const unit = match.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return { reachable: [], attackable: [] };
  return {
    reachable: reachableForUnit(match, unit),
    attackable: attackTargets(match, unit),
  };
}

export async function attack(
  matchId: string,
  attackerId: string,
  targetId: string,
): Promise<AttackOutcome> {
  const owner = await currentOwner();
  if (!(await intentAllowed(owner))) return { ok: false, units: [], rateLimited: true };
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return { ok: false, units: [] };

  const attacker = match.units.find((u) => u.id === attackerId);
  const defender = match.units.find((u) => u.id === targetId);
  if (attacker === undefined || defender === undefined || attacker.owner === defender.owner) {
    return { ok: false, units: match.units };
  }
  if (!attackTargets(match, attacker).some((hex) => hexKey(hex) === hexKey(defender.hex))) {
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
    riverAttack: RIVER_EDGES.has(riverEdgeKey(attacker.hex, defender.hex)),
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
