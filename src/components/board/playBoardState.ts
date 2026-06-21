import type { Hex } from "@/engine/hex";
import type { MatchEvent } from "@/engine/match/events";
import type { Unit } from "@/engine/unit/types";
import type { BoardLoadFailure } from "./BoardLoadError";
import type { DamageFloater } from "./HexBoard";

export interface PlayBoardState {
  readonly matchId: string | null;
  readonly units: readonly Unit[];
  readonly movement: Readonly<Record<string, number>>;
  readonly playerFaction: string;
  readonly turn: number;
  readonly activeFaction: string;
  readonly events: readonly MatchEvent[];
  readonly reachable: readonly Hex[];
  readonly attackable: readonly Hex[];
  readonly floaters: readonly DamageFloater[];
  readonly fadingUnits: readonly Unit[];
  readonly ready: boolean;
  readonly loadError: BoardLoadFailure | null;
  readonly endingTurn: boolean;
  readonly confirmingEnd: boolean;
  readonly confirmingNewGame: boolean;
  readonly toast: string | null;
}

export function initialPlayBoardState(matchId: string | null): PlayBoardState {
  return {
    matchId,
    units: [],
    movement: {},
    playerFaction: "",
    turn: 1,
    activeFaction: "",
    events: [],
    reachable: [],
    attackable: [],
    floaters: [],
    fadingUnits: [],
    ready: false,
    loadError: null,
    endingTurn: false,
    confirmingEnd: false,
    confirmingNewGame: false,
    toast: null,
  };
}

export function isPlayerTurn(state: PlayBoardState): boolean {
  return state.activeFaction === state.playerFaction;
}

export function inputLocked(state: PlayBoardState): boolean {
  return !isPlayerTurn(state) || state.endingTurn;
}

export function playerHasActions(state: PlayBoardState): boolean {
  return state.units.some(
    (unit) => unit.owner === state.playerFaction && (state.movement[unit.id] ?? 0) > 0,
  );
}
