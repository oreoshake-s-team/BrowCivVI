import { applyAttack } from "../combat/applyAttack";
import { applyCityAttack } from "../combat/applyCityAttack";
import { applyCityStrike, cityStrikeTargets } from "../combat/applyCityStrike";
import { reachableAttacks, reachableCityAttacks } from "../combat/targets";
import type { Hex } from "../hex";
import { hexDistance, neighbors } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey, terrainAt } from "../map/types";
import {
  blockingCityHexes,
  captureCityAt,
  factionPolarity,
  LOYALTY_DEFECT_THRESHOLD,
} from "../match/cities";
import {
  appendAttack,
  appendCapture,
  appendCityAttack,
  appendCityStrike,
  appendMove,
} from "../match/events";
import { applyIncite, canIncite } from "../match/incite";
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

function enemyTargetHexes(state: MatchState, faction: string, map: GameMap): readonly Hex[] {
  const hexes: Hex[] = state.units.filter((unit) => unit.owner !== faction).map((unit) => unit.hex);
  for (const city of state.cities) {
    if (city.owner === faction) continue;
    const hex = map.cities.get(city.id)?.hex;
    if (hex !== undefined) hexes.push(hex);
  }
  return hexes;
}

function nearestHex(from: Hex, targets: readonly Hex[]): Hex | undefined {
  let best: Hex | undefined;
  for (const hex of targets) {
    if (best === undefined) {
      best = hex;
      continue;
    }
    if (
      hexDistance(from, hex) < hexDistance(from, best) ||
      (hexDistance(from, hex) === hexDistance(from, best) && hexKey(hex) < hexKey(best))
    )
      best = hex;
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

function weakestCity(
  state: MatchState,
  attacker: Unit,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
): string | undefined {
  let best: string | undefined;
  let bestHp = Infinity;
  for (const hex of reachableCityAttacks(state.movement, attacker, map, riverEdges, state.cities)) {
    const cityId = map.hexes.get(hexKey(hex))?.cityId;
    if (cityId === undefined) continue;
    const city = state.cities.find((candidate) => candidate.id === cityId);
    if (city === undefined) continue;
    if (city.hp < bestHp || (city.hp === bestHp && best !== undefined && cityId < best)) {
      best = cityId;
      bestHp = city.hp;
    }
  }
  return best;
}

function siege(
  state: MatchState,
  attacker: Unit,
  cityId: string,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
  rng: Rng,
): MatchState {
  const cityData = map.cities.get(cityId);
  if (cityData === undefined) return state;
  const terrain = terrainAt(map, cityData.hex);
  const application = applyCityAttack({
    units: state.units,
    cities: state.cities,
    movement: state.movement,
    attackerId: attacker.id,
    cityId,
    cityHex: cityData.hex,
    cityDefense: cityData.defense,
    cityTerrainDefense: terrain?.defenseModifier ?? 0,
    cityTerrainMoveCost: terrain?.moveCost ?? 1,
    riverAttack: riverEdges.has(riverEdgeKey(attacker.hex, cityData.hex)),
    rng,
  });
  return {
    ...state,
    units: application.units,
    cities: application.cities,
    movement: application.movement,
    events: appendCityAttack(state.events, state.turn, attacker, cityId, application),
  };
}

function isCapturableCityHex(state: MatchState, map: GameMap, faction: string, hex: Hex): boolean {
  const cityId = map.hexes.get(hexKey(hex))?.cityId;
  if (cityId === undefined) return false;
  const city = state.cities.find((candidate) => candidate.id === cityId);
  return city !== undefined && city.owner !== faction && city.hp <= 0;
}

function waveringOwnCityHexes(state: MatchState, faction: string, map: GameMap): readonly Hex[] {
  const polarity = factionPolarity(faction);
  if (polarity === 0) return [];
  const hexes: Hex[] = [];
  for (const city of state.cities) {
    if (city.owner !== faction) continue;
    if (polarity * (city.loyalty ?? 0) > -LOYALTY_DEFECT_THRESHOLD) continue;
    const hex = map.cities.get(city.id)?.hex;
    if (hex !== undefined) hexes.push(hex);
  }
  return hexes;
}

function onOrAdjacent(a: Hex, b: Hex): boolean {
  return hexKey(a) === hexKey(b) || neighbors(b).some((n) => hexKey(n) === hexKey(a));
}

function garrisonTargetHexes(state: MatchState, faction: string, map: GameMap): readonly Hex[] {
  return waveringOwnCityHexes(state, faction, map).filter(
    (cityHex) => !state.units.some((u) => u.owner === faction && onOrAdjacent(u.hex, cityHex)),
  );
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
  const holding = waveringOwnCityHexes(state, faction, map).some((hex) =>
    onOrAdjacent(unit.hex, hex),
  );
  if (holding) return undefined;
  const target =
    nearestHex(unit.hex, garrisonTargetHexes(state, faction, map)) ??
    nearestHex(unit.hex, enemyTargetHexes(state, faction, map));
  if (target === undefined) return undefined;
  let best: Hex | undefined;
  let bestDist = hexDistance(unit.hex, target);
  for (const hex of moves) {
    const d = hexDistance(hex, target);
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

function unitAct(
  state: MatchState,
  unit: Unit,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
  rng: Rng,
): MatchState {
  const defender = weakestTarget(state, unit, map, riverEdges);
  if (defender !== undefined) return attack(state, unit, defender, map, riverEdges, rng);
  const cityId = weakestCity(state, unit, map, riverEdges);
  if (cityId !== undefined) return siege(state, unit, cityId, map, riverEdges, rng);
  return state;
}

function chooseInciteTarget(state: MatchState, faction: string, map: GameMap): string | undefined {
  const polarity = factionPolarity(faction);
  if (polarity === 0) return undefined;
  let best: string | undefined;
  let bestValue = -Infinity;
  for (const city of state.cities) {
    if (polarity * (city.loyalty ?? 0) >= LOYALTY_DEFECT_THRESHOLD) continue;
    const value = map.cities.get(city.id)?.value ?? 0;
    if (value > bestValue || (value === bestValue && best !== undefined && city.id < best)) {
      best = city.id;
      bestValue = value;
    }
  }
  return best;
}

function inciteBestCity(state: MatchState, faction: string, map: GameMap): MatchState {
  if (!canIncite(state, faction)) return state;
  const cityId = chooseInciteTarget(state, faction, map);
  if (cityId === undefined) return state;
  return applyIncite(state, faction, cityId) ?? state;
}

function weakestStrikeTarget(targets: readonly Unit[]): Unit | undefined {
  let best: Unit | undefined;
  for (const enemy of targets) {
    if (
      best === undefined ||
      enemy.hp < best.hp ||
      (enemy.hp === best.hp && hexKey(enemy.hex) < hexKey(best.hex))
    )
      best = enemy;
  }
  return best;
}

function runCityStrikes(state: MatchState, faction: string, map: GameMap, rng: Rng): MatchState {
  let next = state;
  for (const seed of state.cities) {
    if (seed.owner !== faction) continue;
    const cityData = map.cities.get(seed.id);
    if (cityData === undefined) continue;
    const city = next.cities.find((candidate) => candidate.id === seed.id);
    if (city === undefined) continue;
    const target = weakestStrikeTarget(cityStrikeTargets(city, cityData.hex, next.units));
    if (target === undefined) continue;
    const terrain = terrainAt(map, target.hex);
    const application = applyCityStrike({
      units: next.units,
      cities: next.cities,
      cityId: seed.id,
      cityHex: cityData.hex,
      cityStrength: cityData.defense,
      targetId: target.id,
      targetTerrainDefense: terrain?.defenseModifier ?? 0,
      targetTerrainMoveCost: terrain?.moveCost ?? 1,
      rng,
    });
    next = {
      ...next,
      units: application.units,
      cities: application.cities,
      events: appendCityStrike(
        next.events,
        next.turn,
        faction,
        seed.id,
        target,
        application.damage,
        application.defeated,
      ),
    };
  }
  return next;
}

export function runFactionTurn(input: FactionTurnInput): MatchState {
  const { faction, map, riverEdges, rng } = input;
  const unitIds = input.state.units.filter((unit) => unit.owner === faction).map((unit) => unit.id);
  let state = inciteBestCity(input.state, faction, map);
  for (const id of unitIds) {
    let unit = state.units.find((candidate) => candidate.id === id);
    if (unit === undefined) continue;
    const acted = unitAct(state, unit, map, riverEdges, rng);
    if (acted !== state) {
      state = acted;
      continue;
    }
    state = stepToward(state, unit, faction, map, riverEdges);
    unit = state.units.find((candidate) => candidate.id === id);
    if (unit === undefined) continue;
    state = unitAct(state, unit, map, riverEdges, rng);
  }
  return runCityStrikes(state, faction, map, rng);
}
