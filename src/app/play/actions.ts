"use server";

import {
  FIRST_SLICE_DIVERGENCE_NODES,
  FIRST_SLICE_MAP,
  FIRST_SLICE_PLAYER_FACTION,
} from "@/content/firstSlice";
import { runFactionTurn } from "@/engine/ai/greedyTurn";
import { applyAttack } from "@/engine/combat/applyAttack";
import { applyCityAttack } from "@/engine/combat/applyCityAttack";
import { reachableAttacks, reachableCityAttacks } from "@/engine/combat/targets";
import {
  pendingDivergence,
  playerOptions,
  resolveDivergenceNode,
  type DivergenceNode,
} from "@/engine/divergence/divergence";
import type { Hex } from "@/engine/hex";
import { hexKey, terrainAt } from "@/engine/map/types";
import { blockingCityHexes, captureCityAt, cityMaxHp, type CityState } from "@/engine/match/cities";
import {
  appendAttack,
  appendCapture,
  appendCityAttack,
  appendMove,
  type MatchEvent,
} from "@/engine/match/events";
import { applyIncite, canIncite } from "@/engine/match/incite";
import { matchCityScores } from "@/engine/match/scoring";
import { matchFormatOutdated, type MatchState } from "@/engine/match/state";
import { StaleMatchError } from "@/engine/match/store";
import { domainOf, movementConstraints } from "@/engine/movement/constraints";
import { riverEdgeKey, riverEdgeSet } from "@/engine/movement/cost";
import { availableMoves, resolveMove } from "@/engine/movement/resolveMove";
import { createRng } from "@/engine/rng";
import { advanceTurn, type TurnContext } from "@/engine/turn/turn";
import { unitTypeById } from "@/engine/unit/catalog";
import { stackingLayerForClass } from "@/engine/unit/classes";
import type { Unit } from "@/engine/unit/types";
import { getOrCreateDefault, createNewMatch, loadOwned } from "@/server/matchService";
import { intentAllowed } from "@/server/rateLimit";
import { ownerSubject } from "@/server/session";
import { getStore } from "@/server/store";

export interface DivergenceOptionView {
  readonly id: string;
  readonly label: string;
  readonly quote: string;
  readonly outcome: string;
}

export interface DivergenceView {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly advisor: string;
  readonly options: readonly DivergenceOptionView[];
  readonly citation: DivergenceNode["citation"];
  readonly media: DivergenceNode["media"];
}

export interface BoardView {
  readonly matchId: string;
  readonly units: readonly Unit[];
  readonly cities: readonly CityState[];
  readonly movement: Readonly<Record<string, number>>;
  readonly playerFaction: string;
  readonly turn: number;
  readonly activeFaction: string;
  readonly events: readonly MatchEvent[];
  readonly scorched: readonly string[];
  readonly spent: readonly string[];
  readonly canIncite: boolean;
  readonly scores?: Readonly<Record<string, number>>;
  readonly pendingDivergence?: DivergenceView;
  readonly incompatible?: boolean;
}

export interface InciteOutcome {
  readonly ok: boolean;
  readonly board: BoardView;
  readonly rateLimited?: boolean;
}

export interface DivergenceOutcome {
  readonly ok: boolean;
  readonly board: BoardView;
}

export type LoadBoardResult =
  | { readonly status: "ok"; readonly board: BoardView }
  | { readonly status: "not-found" };

export interface MoveOutcome {
  readonly ok: boolean;
  readonly units: readonly Unit[];
  readonly cities?: readonly CityState[];
  readonly reachable: readonly Hex[];
  readonly movement: Readonly<Record<string, number>>;
  readonly events?: readonly MatchEvent[];
  readonly spent?: readonly string[];
  readonly rateLimited?: boolean;
}

async function currentOwner(): Promise<string> {
  return ownerSubject();
}

const RIVER_EDGES = riverEdgeSet(FIRST_SLICE_MAP.rivers);

function reachableForUnit(match: MatchState, unit: Unit): readonly Hex[] {
  const constraints = movementConstraints(
    match.units,
    unit,
    RIVER_EDGES,
    blockingCityHexes(match.cities, FIRST_SLICE_MAP, unit.owner),
  );
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
  return [
    ...reachableAttacks(
      match.units,
      match.movement,
      attacker,
      FIRST_SLICE_MAP,
      RIVER_EDGES,
      match.cities,
    ),
    ...reachableCityAttacks(match.movement, attacker, FIRST_SLICE_MAP, RIVER_EDGES, match.cities),
  ];
}

function spentUnitIds(match: MatchState): readonly string[] {
  return match.units
    .filter(
      (unit) =>
        reachableForUnit(match, unit).length === 0 && attackTargets(match, unit).length === 0,
    )
    .map((unit) => unit.id);
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

function divergenceView(node: DivergenceNode): DivergenceView {
  const options = playerOptions(node);
  return {
    id: node.id,
    title: node.title,
    prompt: node.prompt,
    advisor: options[0]?.advisor ?? "",
    options: options.map((option) => ({
      id: option.id,
      label: option.label,
      quote: option.quote,
      outcome: option.outcome,
    })),
    citation: node.citation,
    media: node.media,
  };
}

function boardView(match: MatchState): BoardView {
  const pending = pendingDivergence(match, FIRST_SLICE_DIVERGENCE_NODES);
  const incompatible = matchFormatOutdated(match.schemaVersion);
  return {
    matchId: match.id,
    units: match.units,
    cities: match.cities,
    movement: match.movement,
    playerFaction: FIRST_SLICE_PLAYER_FACTION,
    turn: match.turn,
    activeFaction: match.activeFaction,
    events: match.events,
    scorched: match.scorched,
    spent: spentUnitIds(match),
    canIncite: canIncite(match, FIRST_SLICE_PLAYER_FACTION),
    scores: matchCityScores(match, (id) => FIRST_SLICE_MAP.cities.get(id)?.value ?? 0),
    ...(pending !== null ? { pendingDivergence: divergenceView(pending) } : {}),
    ...(incompatible ? { incompatible: true } : {}),
  };
}

const TURN_CONTEXT: TurnContext = {
  movementOf: (typeId) => unitTypeById(typeId)?.movement ?? 0,
  cityMaxHp: (cityId) => cityMaxHp(FIRST_SLICE_MAP.cities.get(cityId)?.defense ?? 0),
  supply: { map: FIRST_SLICE_MAP, riverEdges: RIVER_EDGES },
  loyalty: {
    map: FIRST_SLICE_MAP,
    isMilitary: (typeId) =>
      stackingLayerForClass(unitTypeById(typeId)?.class ?? "civilian") === "military",
  },
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
    next = runFactionTurn({
      state: next,
      faction: next.activeFaction,
      map: FIRST_SLICE_MAP,
      riverEdges: RIVER_EDGES,
      rng: createRng((next.seed ^ (next.version + 1) ^ next.turn) >>> 0),
    });
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

export async function resolveDivergence(
  matchId: string,
  nodeId: string,
  optionId: string,
): Promise<DivergenceOutcome> {
  const owner = await currentOwner();
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return { ok: false, board: boardView(await resolveMatch(matchId)) };

  const pending = pendingDivergence(match, FIRST_SLICE_DIVERGENCE_NODES);
  if (pending?.id !== nodeId) return { ok: false, board: boardView(match) };

  const rng = createRng((match.seed ^ 0x9e3779b9) >>> 0);
  const resolved = resolveDivergenceNode(match, pending, optionId, rng, { map: FIRST_SLICE_MAP });
  if (resolved === null) return { ok: false, board: boardView(match) };

  try {
    return { ok: true, board: boardView(await store.save(resolved.state)) };
  } catch (error) {
    if (error instanceof StaleMatchError) return { ok: false, board: boardView(match) };
    throw error;
  }
}

export async function incite(matchId: string, cityId: string): Promise<InciteOutcome> {
  const owner = await currentOwner();
  if (!(await intentAllowed(owner)))
    return { ok: false, board: boardView(await resolveMatch(matchId)), rateLimited: true };
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return { ok: false, board: boardView(await resolveMatch(matchId)) };
  if (match.activeFaction !== FIRST_SLICE_PLAYER_FACTION)
    return { ok: false, board: boardView(match) };

  const next = applyIncite(match, FIRST_SLICE_PLAYER_FACTION, cityId);
  if (next === null) return { ok: false, board: boardView(match) };

  try {
    return { ok: true, board: boardView(await store.save(next)) };
  } catch (error) {
    if (error instanceof StaleMatchError) return { ok: false, board: boardView(match) };
    throw error;
  }
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

  const constraints = movementConstraints(
    match.units,
    unit,
    RIVER_EDGES,
    blockingCityHexes(match.cities, FIRST_SLICE_MAP, unit.owner),
  );
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

  const capture = captureCityAt(match.cities, FIRST_SLICE_MAP, result.hex, unit.owner);
  const movedEvents = appendMove(match.events, match.turn, unit, unit.hex, result.hex);
  const next: MatchState = {
    ...match,
    units: match.units.map((u) =>
      u.id === unitId ? { ...u, hex: result.hex, hasMovedThisTurn: true } : u,
    ),
    movement: { ...match.movement, [unitId]: result.remaining },
    cities: capture.cities,
    events:
      capture.captured === null
        ? movedEvents
        : appendCapture(
            movedEvents,
            match.turn,
            unit,
            capture.captured.cityId,
            capture.captured.previousOwner,
          ),
  };

  try {
    const saved = await store.save(next);
    const movedUnit = saved.units.find((candidate) => candidate.id === unitId);
    return {
      ok: true,
      units: saved.units,
      cities: saved.cities,
      reachable: movedUnit === undefined ? [] : reachableForUnit(saved, movedUnit),
      movement: saved.movement,
      events: saved.events,
      spent: spentUnitIds(saved),
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
  readonly events?: readonly MatchEvent[];
  readonly spent?: readonly string[];
  readonly rateLimited?: boolean;
}

export interface CityAttackOutcome {
  readonly ok: boolean;
  readonly units: readonly Unit[];
  readonly cities?: readonly CityState[];
  readonly attackerHex?: Hex;
  readonly cityHex?: Hex;
  readonly cityDamage?: number;
  readonly attackerDamage?: number;
  readonly cityFell?: boolean;
  readonly defeated?: readonly string[];
  readonly movement?: Readonly<Record<string, number>>;
  readonly events?: readonly MatchEvent[];
  readonly spent?: readonly string[];
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
      events: appendAttack(match.events, match.turn, attacker, defender, application),
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
      events: saved.events,
      spent: spentUnitIds(saved),
    };
  } catch (error) {
    if (error instanceof StaleMatchError) return { ok: false, units: match.units };
    throw error;
  }
}

export async function attackCity(
  matchId: string,
  attackerId: string,
  cityId: string,
): Promise<CityAttackOutcome> {
  const owner = await currentOwner();
  if (!(await intentAllowed(owner))) return { ok: false, units: [], rateLimited: true };
  const store = getStore();
  const match = await loadOwned(store, owner, matchId);
  if (match === null) return { ok: false, units: [] };

  const attacker = match.units.find((u) => u.id === attackerId);
  const cityData = FIRST_SLICE_MAP.cities.get(cityId);
  const city = match.cities.find((c) => c.id === cityId);
  if (attacker === undefined || cityData === undefined || city === undefined) {
    return { ok: false, units: match.units };
  }
  if (city.owner === attacker.owner || city.hp <= 0) return { ok: false, units: match.units };
  if (!attackTargets(match, attacker).some((hex) => hexKey(hex) === hexKey(cityData.hex))) {
    return { ok: false, units: match.units };
  }

  const terrain = terrainAt(FIRST_SLICE_MAP, cityData.hex);
  const application = applyCityAttack({
    units: match.units,
    cities: match.cities,
    movement: match.movement,
    attackerId,
    cityId,
    cityHex: cityData.hex,
    cityDefense: cityData.defense,
    cityTerrainDefense: terrain?.defenseModifier ?? 0,
    cityTerrainMoveCost: terrain?.moveCost ?? 1,
    riverAttack: RIVER_EDGES.has(riverEdgeKey(attacker.hex, cityData.hex)),
    rng: createRng((match.seed ^ (match.version + 1)) >>> 0),
  });

  try {
    const saved = await store.save({
      ...match,
      units: application.units,
      cities: application.cities,
      movement: application.movement,
      events: appendCityAttack(match.events, match.turn, attacker, cityId, application),
    });
    return {
      ok: true,
      units: saved.units,
      cities: saved.cities,
      attackerHex: attacker.hex,
      cityHex: cityData.hex,
      cityDamage: application.cityDamage,
      attackerDamage: application.attackerDamage,
      cityFell: application.cityFell,
      defeated: application.defeated,
      movement: saved.movement,
      events: saved.events,
      spent: spentUnitIds(saved),
    };
  } catch (error) {
    if (error instanceof StaleMatchError) return { ok: false, units: match.units };
    throw error;
  }
}
