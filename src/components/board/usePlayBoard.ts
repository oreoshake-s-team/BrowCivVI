import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadBoard, targetsFor, move, attack, newGame, endTurn } from "@/app/play/actions";
import type { Hex } from "@/engine/hex";
import { hexKey } from "@/engine/map/types";
import { inputLocked, playerHasActions, type PlayBoardState } from "./playBoardState";
import { usePlayBoardStore } from "./playBoardStore";

const FLOATER_MS = 1100;
const FADE_MS = 500;
const RATE_LIMIT_MSG = "You're acting too fast — give it a moment and try again.";

export interface PlayBoardController {
  readonly state: PlayBoardState;
  readonly canEndTurn: boolean;
  readonly select: (unitId: string | null) => void;
  readonly moveUnit: (unitId: string, to: Hex) => void;
  readonly attackUnit: (attackerId: string, target: Hex) => void;
  readonly requestEndTurn: () => void;
  readonly confirmEndTurn: () => void;
  readonly cancelEndTurn: () => void;
  readonly requestNewGame: () => void;
  readonly confirmNewGame: () => void;
  readonly cancelNewGame: () => void;
  readonly retry: () => void;
  readonly dismissToast: () => void;
}

export function usePlayBoard(initialMatchId?: string): PlayBoardController {
  const router = useRouter();
  const state = usePlayBoardStore();
  const floaterSeq = useRef(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const store = usePlayBoardStore.getState();
    store.reset();
    void loadBoard(initialMatchId)
      .then((result) => {
        if (!active) return;
        if (result.status === "not-found") {
          store.loadFailed("not-found");
          return;
        }
        store.boardLoaded(result.board);
        if (result.board.matchId !== initialMatchId) {
          router.replace(`/play/${result.board.matchId}`);
        }
      })
      .catch(() => {
        if (active) store.loadFailed("error");
      });
    return () => {
      active = false;
    };
  }, [initialMatchId, router, attempt]);

  useEffect(() => {
    if (state.toast === null) return undefined;
    const timer = setTimeout(() => {
      usePlayBoardStore.getState().setToast(null);
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [state.toast]);

  const pushFloater = (hex: Hex, text: string) => {
    floaterSeq.current += 1;
    const id = `floater-${floaterSeq.current}`;
    usePlayBoardStore.getState().addFloater({ id, hex, text });
    setTimeout(() => {
      usePlayBoardStore.getState().removeFloater(id);
    }, FLOATER_MS);
  };

  const select = async (unitId: string | null) => {
    const store = usePlayBoardStore.getState();
    if (unitId === null || store.matchId === null || inputLocked(store)) {
      store.setTargets([], []);
      return;
    }
    const targets = await targetsFor(store.matchId, unitId);
    usePlayBoardStore.getState().setTargets(targets.reachable, targets.attackable);
  };

  const refreshTargetsOrDeselect = async (matchId: string, unitId: string) => {
    const targets = await targetsFor(matchId, unitId);
    const store = usePlayBoardStore.getState();
    if (targets.reachable.length === 0 && targets.attackable.length === 0) {
      store.autoDeselect();
      return;
    }
    store.setTargets(targets.reachable, targets.attackable);
  };

  const moveUnit = async (unitId: string, to: Hex) => {
    const store = usePlayBoardStore.getState();
    if (store.matchId === null || inputLocked(store)) return;
    const previous = store.units;
    store.moveOptimistic(unitId, to);
    const outcome = await move(store.matchId, unitId, to);
    if (outcome.ok) {
      usePlayBoardStore
        .getState()
        .moveApplied(outcome.units, outcome.movement, outcome.reachable, outcome.events);
      await refreshTargetsOrDeselect(store.matchId, unitId);
    } else {
      usePlayBoardStore
        .getState()
        .actionRejected(
          previous,
          outcome.rateLimited ? RATE_LIMIT_MSG : "Move rejected — the board changed. Try again.",
        );
    }
  };

  const attackUnit = async (attackerId: string, target: Hex) => {
    const store = usePlayBoardStore.getState();
    if (store.matchId === null || inputLocked(store)) return;
    const defender = store.units.find((unit) => hexKey(unit.hex) === hexKey(target));
    if (defender === undefined) return;
    store.setTargets([], []);
    const outcome = await attack(store.matchId, attackerId, defender.id);
    if (!outcome.ok) {
      usePlayBoardStore
        .getState()
        .setToast(
          outcome.rateLimited ? RATE_LIMIT_MSG : "Attack rejected — the board changed. Try again.",
        );
      return;
    }
    usePlayBoardStore.getState().attackApplied(outcome.units, outcome.movement, outcome.events);
    if (outcome.attackerHex !== undefined && outcome.attackerDamage !== undefined) {
      pushFloater(outcome.attackerHex, `-${outcome.attackerDamage}`);
    }
    if (outcome.defenderHex !== undefined && outcome.defenderDamage !== undefined) {
      pushFloater(outcome.defenderHex, `-${outcome.defenderDamage}`);
    }
    const defeatedIds = new Set(outcome.defeated ?? []);
    const fading = store.units.filter((unit) => defeatedIds.has(unit.id));
    if (fading.length > 0) {
      usePlayBoardStore.getState().setFading(fading);
      setTimeout(() => {
        usePlayBoardStore.getState().setFading([]);
      }, FADE_MS);
    }
    await refreshTargetsOrDeselect(store.matchId, attackerId);
  };

  const confirmNewGame = async () => {
    const board = await newGame();
    usePlayBoardStore.getState().gameStarted(board);
    router.push(`/play/${board.matchId}`);
  };

  const confirmEndTurn = async () => {
    const store = usePlayBoardStore.getState();
    if (store.matchId === null) return;
    store.endTurnStarted();
    try {
      usePlayBoardStore.getState().endTurnFinished(await endTurn(store.matchId));
    } catch {
      usePlayBoardStore.getState().endTurnFailed();
    }
  };

  const requestEndTurn = () => {
    if (playerHasActions(usePlayBoardStore.getState())) {
      usePlayBoardStore.getState().setConfirmEnd(true);
    } else {
      void confirmEndTurn();
    }
  };

  return {
    state,
    canEndTurn: !inputLocked(state),
    select: (unitId) => {
      void select(unitId);
    },
    moveUnit: (unitId, to) => {
      void moveUnit(unitId, to);
    },
    attackUnit: (attackerId, to) => {
      void attackUnit(attackerId, to);
    },
    requestEndTurn,
    confirmEndTurn: () => {
      void confirmEndTurn();
    },
    cancelEndTurn: () => {
      usePlayBoardStore.getState().setConfirmEnd(false);
    },
    requestNewGame: () => {
      usePlayBoardStore.getState().setConfirmNewGame(true);
    },
    confirmNewGame: () => {
      void confirmNewGame();
    },
    cancelNewGame: () => {
      usePlayBoardStore.getState().setConfirmNewGame(false);
    },
    retry: () => {
      setAttempt((n) => n + 1);
    },
    dismissToast: () => {
      usePlayBoardStore.getState().setToast(null);
    },
  };
}
