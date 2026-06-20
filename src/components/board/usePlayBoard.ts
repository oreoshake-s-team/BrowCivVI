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
  const dispatch = state.dispatch;
  const floaterSeq = useRef(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    dispatch({ type: "reset" });
    void loadBoard(initialMatchId)
      .then((result) => {
        if (!active) return;
        if (result.status === "not-found") {
          dispatch({ type: "loadFailed", reason: "not-found" });
          return;
        }
        dispatch({ type: "boardLoaded", board: result.board });
        if (result.board.matchId !== initialMatchId) {
          router.replace(`/play/${result.board.matchId}`);
        }
      })
      .catch(() => {
        if (active) dispatch({ type: "loadFailed", reason: "error" });
      });
    return () => {
      active = false;
    };
  }, [initialMatchId, router, attempt, dispatch]);

  useEffect(() => {
    if (state.toast === null) return undefined;
    const timer = setTimeout(() => {
      dispatch({ type: "toastCleared" });
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [state.toast, dispatch]);

  const pushFloater = (hex: Hex, text: string) => {
    floaterSeq.current += 1;
    const id = `floater-${floaterSeq.current}`;
    dispatch({ type: "floaterAdded", floater: { id, hex, text } });
    setTimeout(() => {
      dispatch({ type: "floaterRemoved", id });
    }, FLOATER_MS);
  };

  const select = async (unitId: string | null) => {
    const current = usePlayBoardStore.getState();
    if (unitId === null || current.matchId === null || inputLocked(current)) {
      dispatch({ type: "targetsCleared" });
      return;
    }
    const targets = await targetsFor(current.matchId, unitId);
    dispatch({
      type: "targetsLoaded",
      reachable: targets.reachable,
      attackable: targets.attackable,
    });
  };

  const moveUnit = async (unitId: string, to: Hex) => {
    const current = usePlayBoardStore.getState();
    if (current.matchId === null || inputLocked(current)) return;
    const previous = current.units;
    dispatch({ type: "moveOptimistic", unitId, to });
    const outcome = await move(current.matchId, unitId, to);
    if (outcome.ok) {
      dispatch({
        type: "moveApplied",
        units: outcome.units,
        movement: outcome.movement,
        reachable: outcome.reachable,
      });
    } else {
      dispatch({
        type: "actionRejected",
        units: previous,
        message: outcome.rateLimited
          ? RATE_LIMIT_MSG
          : "Move rejected — the board changed. Try again.",
      });
    }
  };

  const attackUnit = async (attackerId: string, target: Hex) => {
    const current = usePlayBoardStore.getState();
    if (current.matchId === null || inputLocked(current)) return;
    const defender = current.units.find((unit) => hexKey(unit.hex) === hexKey(target));
    if (defender === undefined) return;
    dispatch({ type: "targetsCleared" });
    const outcome = await attack(current.matchId, attackerId, defender.id);
    if (!outcome.ok) {
      dispatch({
        type: "toastShown",
        message: outcome.rateLimited
          ? RATE_LIMIT_MSG
          : "Attack rejected — the board changed. Try again.",
      });
      return;
    }
    dispatch({
      type: "attackApplied",
      units: outcome.units,
      ...(outcome.movement !== undefined ? { movement: outcome.movement } : {}),
    });
    if (outcome.attackerHex !== undefined && outcome.attackerDamage !== undefined) {
      pushFloater(outcome.attackerHex, `-${outcome.attackerDamage}`);
    }
    if (outcome.defenderHex !== undefined && outcome.defenderDamage !== undefined) {
      pushFloater(outcome.defenderHex, `-${outcome.defenderDamage}`);
    }
    const defeatedIds = new Set(outcome.defeated ?? []);
    const fading = current.units.filter((unit) => defeatedIds.has(unit.id));
    if (fading.length > 0) {
      dispatch({ type: "fadingSet", units: fading });
      setTimeout(() => {
        dispatch({ type: "fadingCleared" });
      }, FADE_MS);
    }
  };

  const confirmNewGame = async () => {
    const board = await newGame();
    dispatch({ type: "gameStarted", board });
    router.push(`/play/${board.matchId}`);
  };

  const confirmEndTurn = async () => {
    const current = usePlayBoardStore.getState();
    if (current.matchId === null) return;
    dispatch({ type: "endTurnStarted" });
    try {
      dispatch({ type: "endTurnFinished", board: await endTurn(current.matchId) });
    } catch {
      dispatch({ type: "endTurnFailed" });
    }
  };

  const requestEndTurn = () => {
    if (playerHasActions(usePlayBoardStore.getState())) dispatch({ type: "confirmEnd" });
    else void confirmEndTurn();
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
      dispatch({ type: "cancelEnd" });
    },
    requestNewGame: () => {
      dispatch({ type: "confirmNewGame" });
    },
    confirmNewGame: () => {
      void confirmNewGame();
    },
    cancelNewGame: () => {
      dispatch({ type: "cancelNewGame" });
    },
    retry: () => {
      setAttempt((n) => n + 1);
    },
    dismissToast: () => {
      dispatch({ type: "toastCleared" });
    },
  };
}
