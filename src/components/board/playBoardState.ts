import type { BoardView } from "@/app/play/actions";
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

export type PlayBoardAction =
  | { readonly type: "boardLoaded"; readonly board: BoardView }
  | { readonly type: "gameStarted"; readonly board: BoardView }
  | { readonly type: "loadFailed"; readonly reason: BoardLoadFailure }
  | { readonly type: "reset" }
  | {
      readonly type: "targetsLoaded";
      readonly reachable: readonly Hex[];
      readonly attackable: readonly Hex[];
    }
  | { readonly type: "targetsCleared" }
  | { readonly type: "moveOptimistic"; readonly unitId: string; readonly to: Hex }
  | {
      readonly type: "moveApplied";
      readonly units: readonly Unit[];
      readonly movement: Readonly<Record<string, number>>;
      readonly reachable: readonly Hex[];
      readonly events?: readonly MatchEvent[];
    }
  | { readonly type: "actionRejected"; readonly units: readonly Unit[]; readonly message: string }
  | { readonly type: "toastShown"; readonly message: string }
  | {
      readonly type: "attackApplied";
      readonly units: readonly Unit[];
      readonly movement?: Readonly<Record<string, number>>;
      readonly events?: readonly MatchEvent[];
    }
  | { readonly type: "floaterAdded"; readonly floater: DamageFloater }
  | { readonly type: "floaterRemoved"; readonly id: string }
  | { readonly type: "fadingSet"; readonly units: readonly Unit[] }
  | { readonly type: "fadingCleared" }
  | { readonly type: "endTurnStarted" }
  | { readonly type: "endTurnFinished"; readonly board: BoardView }
  | { readonly type: "endTurnFailed" }
  | { readonly type: "confirmEnd" }
  | { readonly type: "cancelEnd" }
  | { readonly type: "confirmNewGame" }
  | { readonly type: "cancelNewGame" }
  | { readonly type: "toastCleared" };

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

function withBoard(state: PlayBoardState, board: BoardView): PlayBoardState {
  return {
    ...state,
    matchId: board.matchId,
    units: board.units,
    movement: board.movement,
    playerFaction: board.playerFaction,
    turn: board.turn,
    activeFaction: board.activeFaction,
    events: board.events,
  };
}

export function playBoardReducer(state: PlayBoardState, action: PlayBoardAction): PlayBoardState {
  switch (action.type) {
    case "boardLoaded":
      return { ...withBoard(state, action.board), loadError: null, ready: true };
    case "gameStarted":
      return {
        ...withBoard(state, action.board),
        reachable: [],
        attackable: [],
        confirmingNewGame: false,
      };
    case "loadFailed":
      return { ...state, loadError: action.reason };
    case "reset":
      return initialPlayBoardState(null);
    case "targetsLoaded":
      return { ...state, reachable: action.reachable, attackable: action.attackable };
    case "targetsCleared":
      return { ...state, reachable: [], attackable: [] };
    case "moveOptimistic":
      return {
        ...state,
        units: state.units.map((unit) =>
          unit.id === action.unitId ? { ...unit, hex: action.to } : unit,
        ),
        reachable: [],
        attackable: [],
      };
    case "moveApplied":
      return {
        ...state,
        units: action.units,
        movement: action.movement,
        reachable: action.reachable,
        events: action.events ?? state.events,
      };
    case "actionRejected":
      return { ...state, units: action.units, toast: action.message };
    case "toastShown":
      return { ...state, toast: action.message };
    case "attackApplied":
      return {
        ...state,
        units: action.units,
        movement: action.movement ?? state.movement,
        events: action.events ?? state.events,
      };
    case "floaterAdded":
      return { ...state, floaters: [...state.floaters, action.floater] };
    case "floaterRemoved":
      return { ...state, floaters: state.floaters.filter((f) => f.id !== action.id) };
    case "fadingSet":
      return { ...state, fadingUnits: action.units };
    case "fadingCleared":
      return { ...state, fadingUnits: [] };
    case "endTurnStarted":
      return { ...state, endingTurn: true, confirmingEnd: false, reachable: [], attackable: [] };
    case "endTurnFinished":
      return { ...withBoard(state, action.board), endingTurn: false };
    case "endTurnFailed":
      return { ...state, endingTurn: false };
    case "confirmEnd":
      return { ...state, confirmingEnd: true };
    case "cancelEnd":
      return { ...state, confirmingEnd: false };
    case "confirmNewGame":
      return { ...state, confirmingNewGame: true };
    case "cancelNewGame":
      return { ...state, confirmingNewGame: false };
    case "toastCleared":
      return { ...state, toast: null };
  }
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
