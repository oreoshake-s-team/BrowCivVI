import { create } from "zustand";
import type { BoardView } from "@/app/play/actions";
import type { Hex } from "@/engine/hex";
import type { MatchEvent } from "@/engine/match/events";
import type { Unit } from "@/engine/unit/types";
import type { BoardLoadFailure } from "./BoardLoadError";
import type { DamageFloater } from "./HexBoard";
import { initialPlayBoardState, type PlayBoardState } from "./playBoardState";

export interface PlayBoardStore extends PlayBoardState {
  readonly boardLoaded: (board: BoardView) => void;
  readonly gameStarted: (board: BoardView) => void;
  readonly loadFailed: (reason: BoardLoadFailure) => void;
  readonly reset: () => void;
  readonly setTargets: (reachable: readonly Hex[], attackable: readonly Hex[]) => void;
  readonly moveOptimistic: (unitId: string, to: Hex) => void;
  readonly moveApplied: (
    units: readonly Unit[],
    movement: Readonly<Record<string, number>>,
    reachable: readonly Hex[],
    events?: readonly MatchEvent[],
  ) => void;
  readonly actionRejected: (units: readonly Unit[], message: string) => void;
  readonly attackApplied: (
    units: readonly Unit[],
    movement?: Readonly<Record<string, number>>,
    events?: readonly MatchEvent[],
  ) => void;
  readonly addFloater: (floater: DamageFloater) => void;
  readonly removeFloater: (id: string) => void;
  readonly setFading: (units: readonly Unit[]) => void;
  readonly endTurnStarted: () => void;
  readonly endTurnFinished: (board: BoardView) => void;
  readonly endTurnFailed: () => void;
  readonly setConfirmEnd: (value: boolean) => void;
  readonly setConfirmNewGame: (value: boolean) => void;
  readonly setToast: (toast: string | null) => void;
}

function projectBoard(board: BoardView): Partial<PlayBoardState> {
  return {
    matchId: board.matchId,
    units: board.units,
    movement: board.movement,
    playerFaction: board.playerFaction,
    turn: board.turn,
    activeFaction: board.activeFaction,
    events: board.events,
  };
}

export const usePlayBoardStore = create<PlayBoardStore>((set) => ({
  ...initialPlayBoardState(null),
  boardLoaded: (board) => {
    set({ ...projectBoard(board), loadError: null, ready: true });
  },
  gameStarted: (board) => {
    set({ ...projectBoard(board), reachable: [], attackable: [], confirmingNewGame: false });
  },
  loadFailed: (reason) => {
    set({ loadError: reason });
  },
  reset: () => {
    set(initialPlayBoardState(null));
  },
  setTargets: (reachable, attackable) => {
    set({ reachable, attackable });
  },
  moveOptimistic: (unitId, to) => {
    set((state) => ({
      units: state.units.map((unit) => (unit.id === unitId ? { ...unit, hex: to } : unit)),
      reachable: [],
      attackable: [],
    }));
  },
  moveApplied: (units, movement, reachable, events) => {
    set((state) => ({ units, movement, reachable, events: events ?? state.events }));
  },
  actionRejected: (units, message) => {
    set({ units, toast: message });
  },
  attackApplied: (units, movement, events) => {
    set((state) => ({
      units,
      movement: movement ?? state.movement,
      events: events ?? state.events,
    }));
  },
  addFloater: (floater) => {
    set((state) => ({ floaters: [...state.floaters, floater] }));
  },
  removeFloater: (id) => {
    set((state) => ({ floaters: state.floaters.filter((floater) => floater.id !== id) }));
  },
  setFading: (units) => {
    set({ fadingUnits: units });
  },
  endTurnStarted: () => {
    set({ endingTurn: true, confirmingEnd: false, reachable: [], attackable: [] });
  },
  endTurnFinished: (board) => {
    set({ ...projectBoard(board), endingTurn: false });
  },
  endTurnFailed: () => {
    set({ endingTurn: false });
  },
  setConfirmEnd: (value) => {
    set({ confirmingEnd: value });
  },
  setConfirmNewGame: (value) => {
    set({ confirmingNewGame: value });
  },
  setToast: (toast) => {
    set({ toast });
  },
}));
