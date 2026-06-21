import type { Citation } from "../content/citation";
import type { MediaLink } from "../content/media";
import type { DivergenceRecord, MatchState } from "../match/state";
import { randomInt, type Rng } from "../rng";

export interface MoraleEffect {
  readonly kind: "morale";
  readonly faction: string;
  readonly delta: number;
}

export type DivergenceEffect = MoraleEffect;

export interface DivergenceOption {
  readonly id: string;
  readonly faction: string;
  readonly advisor: string;
  readonly label: string;
  readonly quote: string;
  readonly outcome: string;
  readonly effect: DivergenceEffect;
}

export interface DivergenceNode {
  readonly id: string;
  readonly trigger: { readonly turn: number; readonly faction: string };
  readonly title: string;
  readonly prompt: string;
  readonly options: readonly DivergenceOption[];
  readonly citation: Citation;
  readonly media: readonly MediaLink[];
}

export function playerOptions(node: DivergenceNode): readonly DivergenceOption[] {
  return node.options.filter((option) => option.faction === node.trigger.faction);
}

export function rivalOptions(node: DivergenceNode): readonly DivergenceOption[] {
  return node.options.filter((option) => option.faction !== node.trigger.faction);
}

export function seededRivalOption(node: DivergenceNode, rng: Rng): DivergenceOption | null {
  const options = rivalOptions(node);
  return options.length === 0 ? null : (options[randomInt(rng, options.length)] ?? null);
}

export function pendingDivergence(
  state: MatchState,
  nodes: readonly DivergenceNode[],
): DivergenceNode | null {
  return (
    nodes.find(
      (node) =>
        state.turn === node.trigger.turn &&
        state.activeFaction === node.trigger.faction &&
        state.divergence[node.id] === undefined,
    ) ?? null
  );
}

export function applyDivergenceEffect(state: MatchState, effect: DivergenceEffect): MatchState {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.owner === effect.faction
        ? { ...unit, morale: Math.max(0, Math.min(100, unit.morale + effect.delta)) }
        : unit,
    ),
  };
}

export interface DivergenceResolution {
  readonly state: MatchState;
  readonly record: DivergenceRecord;
}

export function resolveDivergenceNode(
  state: MatchState,
  node: DivergenceNode,
  optionId: string,
  rng: Rng,
): DivergenceResolution | null {
  const chosen = playerOptions(node).find((option) => option.id === optionId);
  if (chosen === undefined) return null;
  const rival = seededRivalOption(node, rng);
  let next = applyDivergenceEffect(state, chosen.effect);
  if (rival !== null) next = applyDivergenceEffect(next, rival.effect);
  const record: DivergenceRecord = { choice: chosen.id, rival: rival?.id ?? "" };
  return { state: { ...next, divergence: { ...next.divergence, [node.id]: record } }, record };
}
