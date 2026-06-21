import { healCities } from "../match/cities";
import { applyDefections } from "../match/defection";
import { applyLoyaltyPressure, type LoyaltyContext } from "../match/loyalty";
import type { MatchState } from "../match/state";
import { applyOutOfSupplyAttrition } from "../supply/attrition";
import { computeSupply, type SupplyContext } from "../supply/propagation";

export interface TurnContext {
  readonly movementOf: (typeId: string) => number;
  readonly cityMaxHp: (cityId: string) => number;
  readonly supply?: SupplyContext;
  readonly loyalty?: LoyaltyContext;
}

export type TurnPhase = (state: MatchState, faction: string, ctx: TurnContext) => MatchState;

function supplyPropagation(state: MatchState, _faction: string, ctx: TurnContext): MatchState {
  return ctx.supply === undefined ? state : computeSupply(state, ctx.supply);
}

function loyaltyPressure(state: MatchState, _faction: string, ctx: TurnContext): MatchState {
  return ctx.loyalty === undefined ? state : applyLoyaltyPressure(state, ctx.loyalty);
}

function defection(state: MatchState, _faction: string, ctx: TurnContext): MatchState {
  return ctx.loyalty === undefined ? state : applyDefections(state, ctx.loyalty);
}

function outOfSupplyAttrition(state: MatchState, faction: string): MatchState {
  return applyOutOfSupplyAttrition(state, faction);
}

function healFactionCities(state: MatchState, faction: string, ctx: TurnContext): MatchState {
  return { ...state, cities: healCities(state.cities, faction, ctx.cityMaxHp) };
}

function restoreMovement(state: MatchState, faction: string, ctx: TurnContext): MatchState {
  const movement: Record<string, number> = { ...state.movement };
  const units = state.units.map((unit) => {
    if (unit.owner !== faction) return unit;
    movement[unit.id] = ctx.movementOf(unit.typeId);
    if (!unit.hasMovedThisTurn && unit.hasAttackedThisTurn !== true) return unit;
    return { ...unit, hasMovedThisTurn: false, hasAttackedThisTurn: false };
  });
  return { ...state, units, movement };
}

export const TURN_START_PHASES: readonly TurnPhase[] = [
  restoreMovement,
  healFactionCities,
  supplyPropagation,
  outOfSupplyAttrition,
  loyaltyPressure,
  defection,
];
export const TURN_END_PHASES: readonly TurnPhase[] = [];

function runPhases(
  phases: readonly TurnPhase[],
  state: MatchState,
  faction: string,
  ctx: TurnContext,
): MatchState {
  return phases.reduce((acc, phase) => phase(acc, faction, ctx), state);
}

export function advanceTurn(state: MatchState, ctx: TurnContext): MatchState {
  const ended = runPhases(TURN_END_PHASES, state, state.activeFaction, ctx);
  const order = ended.turnOrder;
  const index = order.indexOf(ended.activeFaction);
  const nextIndex = order.length === 0 ? 0 : (index + 1) % order.length;
  const advanced: MatchState = {
    ...ended,
    activeFaction: order[nextIndex] ?? ended.activeFaction,
    turn: nextIndex === 0 ? ended.turn + 1 : ended.turn,
  };
  return runPhases(TURN_START_PHASES, advanced, advanced.activeFaction, ctx);
}
