import { applyAttack } from "../combat/applyAttack";
import { reachableAttacks } from "../combat/targets";
import type { Hex } from "../hex";
import { hexDistance } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey, terrainAt } from "../map/types";
import { blockingCityHexes, captureCityAt } from "../match/cities";
import { appendAttack, appendCapture, appendMove } from "../match/events";
import type { MatchState } from "../match/state";
import { domainOf, movementConstraints } from "../movement/constraints";
import { riverEdgeKey } from "../movement/cost";
import { availableMoves, resolveMove } from "../movement/resolveMove";
import type { Rng } from "../rng";
import type { Unit } from "../unit/types";

export interface FactionTurnInput {
  readonly state: MatchState;
  readonly faction: string;
  readonly map: GameMap;
  readonly riverEdges: ReadonlySet<string>;
  readonly rng: Rng;
}

function nearestEnemy(unit: Unit, faction: string, units: readonly Unit[]): Unit | undefined {
  let best: Unit | undefined;
  for (const enemy of units) {
    if (enemy.owner === faction) continue;
    if (best === undefined) {
      best = enemy;
      continue;
    }
    const d = hexDistance(unit.hex, enemy.hex);
    const bd = hexDistance(unit.hex, best.hex);
    if (d < bd || (d === bd && hexKey(enemy.hex) < hexKey(best.hex))) best = enemy;
  }
  return best;
}

function weakestTarget(
  state: MatchState,
  attacker: Unit,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
): Unit | undefined {
  let best: Unit | undefined;
  for (const hex of reachableAttacks(state.units, state.movement, attacker, map, riverEdges)) {
    const enemy = state.units.find(
      (unit) => hexKey(unit.hex) === hexKey(hex) && unit.owner !== attacker.owner,
    );
    if (enemy === undefined) continue;
    if (
      best === undefined ||
      enemy.hp < best.hp ||
      (enemy.hp === best.hp && hexKey(enemy.hex) < hexKey(best.hex))
    )
      best = enemy;
  }
  return best;
}

function attack(
  state: MatchState,
  attacker: Unit,
  defender: Unit,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
  rng: Rng,
): MatchState {
  const terrain = terrainAt(map, defender.hex);
  const application = applyAttack({
    units: state.units,
    movement: state.movement,
    attackerId: attacker.id,
    defenderId: defender.id,
    defenderTerrainDefense: terrain?.defenseModifier ?? 0,
    defenderTerrainMoveCost: terrain?.moveCost ?? 1,
    riverAttack: riverEdges.has(riverEdgeKey(attacker.hex, defender.hex)),
    rng,
  });
  return {
    ...state,
    units: application.units,
    movement: application.movement,
    events: appendAttack(state.events, state.turn, attacker, defender, application),
  };
}

function isCapturableCityHex(state: MatchState, map: GameMap, faction: string, hex: Hex): boolean {
  const cityId = map.hexes.get(hexKey(hex))?.cityId;
  if (cityId === undefined) return false;
  const city = state.cities.find((candidate) => candidate.id === cityId);
  return city !== undefined && city.owner !== faction && city.hp <= 0;
}

function chooseDestination(
  state: MatchState,
  unit: Unit,
  faction: string,
  map: GameMap,
  moves: readonly Hex[],
): Hex | undefined {
  let capture: Hex | undefined;
  for (const hex of moves) {
    if (
      isCapturableCityHex(state, map, faction, hex) &&
      (capture === undefined || hexKey(hex) < hexKey(capture))
    ) {
      capture = hex;
    }
  }
  if (capture !== undefined) return capture;
  const target = nearestEnemy(unit, faction, state.units);
  if (target === undefined) return undefined;
  let best: Hex | undefined;
  let bestDist = hexDistance(unit.hex, target.hex);
  for (const hex of moves) {
    const d = hexDistance(hex, target.hex);
    if (d < bestDist || (d === bestDist && best !== undefined && hexKey(hex) < hexKey(best))) {
      best = hex;
      bestDist = d;
    }
  }
  return best;
}

function stepToward(
  state: MatchState,
  unit: Unit,
  faction: string,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
): MatchState {
  const constraints = movementConstraints(
    state.units,
    unit,
    riverEdges,
    blockingCityHexes(state.cities, map, faction),
  );
  if (unit.hasMovedThisTurn && constraints.zoneOfControl.has(hexKey(unit.hex))) return state;
  const query = {
    from: unit.hex,
    movement: state.movement[unit.id] ?? 0,
    domain: domainOf(unit.typeId),
    map,
    riverEdges,
    atFullMovement: !unit.hasMovedThisTurn,
    ...constraints,
  };
  const best = chooseDestination(state, unit, faction, map, availableMoves(query));
  if (best === undefined) return state;
  const result = resolveMove({ unitId: unit.id, to: best, ...query });
  if (!result.ok) return state;
  const capture = captureCityAt(state.cities, map, result.hex, faction);
  const moved = appendMove(state.events, state.turn, unit, unit.hex, result.hex);
  return {
    ...state,
    units: state.units.map((current) =>
      current.id === unit.id ? { ...current, hex: result.hex, hasMovedThisTurn: true } : current,
    ),
    movement: { ...state.movement, [unit.id]: result.remaining },
    cities: capture.cities,
    events:
      capture.captured === null
        ? moved
        : appendCapture(
            moved,
            state.turn,
            unit,
            capture.captured.cityId,
            capture.captured.previousOwner,
          ),
  };
}

export function runFactionTurn(input: FactionTurnInput): MatchState {
  const { faction, map, riverEdges, rng } = input;
  const unitIds = input.state.units.filter((unit) => unit.owner === faction).map((unit) => unit.id);
  let state = input.state;
  for (const id of unitIds) {
    let unit = state.units.find((candidate) => candidate.id === id);
    if (unit === undefined) continue;
    let defender = weakestTarget(state, unit, map, riverEdges);
    if (defender === undefined) {
      state = stepToward(state, unit, faction, map, riverEdges);
      unit = state.units.find((candidate) => candidate.id === id);
      if (unit === undefined) continue;
      defender = weakestTarget(state, unit, map, riverEdges);
    }
    if (defender !== undefined) state = attack(state, unit, defender, map, riverEdges, rng);
  }
  return state;
}
