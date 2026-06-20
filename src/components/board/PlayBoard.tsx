"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadBoard, targetsFor, move, attack, newGame } from "@/app/play/actions";
import type { NamedRegion } from "@/engine/content/region";
import type { Hex } from "@/engine/hex";
import { hexKey } from "@/engine/map/types";
import type { GameMap } from "@/engine/map/types";
import type { Unit } from "@/engine/unit/types";
import { BoardLoadError, type BoardLoadFailure } from "./BoardLoadError";
import { HexBoard, type DamageFloater } from "./HexBoard";
import styles from "./PlayBoard.module.css";
import { Toast } from "./Toast";

const FLOATER_MS = 1100;
const FADE_MS = 500;
const RATE_LIMIT_MSG = "You're acting too fast — give it a moment and try again.";

export interface PlayBoardProps {
  readonly map: GameMap;
  readonly regions?: readonly NamedRegion[];
  readonly initialMatchId?: string | undefined;
}

export function PlayBoard({ map, regions = [], initialMatchId }: PlayBoardProps) {
  const router = useRouter();
  const [matchId, setMatchId] = useState<string | null>(initialMatchId ?? null);
  const [units, setUnits] = useState<readonly Unit[]>([]);
  const [movement, setMovement] = useState<Readonly<Record<string, number>>>({});
  const [playerFaction, setPlayerFaction] = useState<string>("");
  const [reachable, setReachable] = useState<readonly Hex[]>([]);
  const [attackable, setAttackable] = useState<readonly Hex[]>([]);
  const [floaters, setFloaters] = useState<readonly DamageFloater[]>([]);
  const [fadingUnits, setFadingUnits] = useState<readonly Unit[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<BoardLoadFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const floaterSeq = useRef(0);

  useEffect(() => {
    let active = true;
    void loadBoard(initialMatchId)
      .then((result) => {
        if (!active) return;
        if (result.status === "not-found") {
          setLoadError("not-found");
          return;
        }
        setLoadError(null);
        const board = result.board;
        setUnits(board.units);
        setMovement(board.movement);
        setPlayerFaction(board.playerFaction);
        setMatchId(board.matchId);
        setReady(true);
        if (board.matchId !== initialMatchId) router.replace(`/play/${board.matchId}`);
      })
      .catch(() => {
        if (active) setLoadError("error");
      });
    return () => {
      active = false;
    };
  }, [initialMatchId, router, attempt]);

  useEffect(() => {
    if (toast === null) return undefined;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [toast]);

  const clearTargets = () => {
    setReachable([]);
    setAttackable([]);
  };

  const handleSelect = async (unitId: string | null) => {
    if (unitId === null || matchId === null) {
      clearTargets();
      return;
    }
    const targets = await targetsFor(matchId, unitId);
    setReachable(targets.reachable);
    setAttackable(targets.attackable);
  };

  const handleMove = async (unitId: string, to: Hex) => {
    if (matchId === null) return;
    const previous = units;
    setUnits(units.map((unit) => (unit.id === unitId ? { ...unit, hex: to } : unit)));
    clearTargets();
    const outcome = await move(matchId, unitId, to);
    if (outcome.ok) {
      setUnits(outcome.units);
      setMovement(outcome.movement);
      setReachable(outcome.reachable);
    } else {
      setUnits(previous);
      setToast(
        outcome.rateLimited ? RATE_LIMIT_MSG : "Move rejected — the board changed. Try again.",
      );
    }
  };

  const pushFloater = (hex: Hex, text: string) => {
    floaterSeq.current += 1;
    const id = `floater-${floaterSeq.current}`;
    setFloaters((current) => [...current, { id, hex, text }]);
    setTimeout(() => {
      setFloaters((current) => current.filter((floater) => floater.id !== id));
    }, FLOATER_MS);
  };

  const handleAttack = async (attackerId: string, target: Hex) => {
    if (matchId === null) return;
    const defender = units.find((unit) => hexKey(unit.hex) === hexKey(target));
    if (defender === undefined) return;
    clearTargets();
    const outcome = await attack(matchId, attackerId, defender.id);
    if (!outcome.ok) {
      setToast(
        outcome.rateLimited ? RATE_LIMIT_MSG : "Attack rejected — the board changed. Try again.",
      );
      return;
    }
    const previous = units;
    setUnits(outcome.units);
    if (outcome.movement !== undefined) setMovement(outcome.movement);
    if (outcome.attackerHex !== undefined && outcome.attackerDamage !== undefined) {
      pushFloater(outcome.attackerHex, `-${outcome.attackerDamage}`);
    }
    if (outcome.defenderHex !== undefined && outcome.defenderDamage !== undefined) {
      pushFloater(outcome.defenderHex, `-${outcome.defenderDamage}`);
    }
    const defeatedIds = new Set(outcome.defeated ?? []);
    const fading = previous.filter((unit) => defeatedIds.has(unit.id));
    if (fading.length > 0) {
      setFadingUnits(fading);
      setTimeout(() => {
        setFadingUnits([]);
      }, FADE_MS);
    }
  };

  const startNewGame = async () => {
    setConfirming(false);
    const board = await newGame();
    setUnits(board.units);
    setMovement(board.movement);
    setPlayerFaction(board.playerFaction);
    setMatchId(board.matchId);
    clearTargets();
    router.push(`/play/${board.matchId}`);
  };

  if (loadError !== null) {
    return (
      <BoardLoadError
        reason={loadError}
        onRetry={() => {
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!ready) return <p role="status">Loading the campaign…</p>;

  return (
    <>
      <div className={styles.controls}>
        {confirming ? (
          <span className={styles.confirm}>
            Start a new game?
            <button type="button" onClick={() => void startNewGame()}>
              Yes
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
            }}
          >
            New game
          </button>
        )}
      </div>
      <HexBoard
        map={map}
        units={units}
        regions={regions}
        movement={movement}
        playerFaction={playerFaction}
        reachable={reachable}
        attackable={attackable}
        floaters={floaters}
        fadingUnits={fadingUnits}
        onSelect={(unitId) => void handleSelect(unitId)}
        onMove={(unitId, to) => void handleMove(unitId, to)}
        onAttack={(attackerId, to) => void handleAttack(attackerId, to)}
      />
      {toast !== null ? (
        <Toast
          message={toast}
          onDismiss={() => {
            setToast(null);
          }}
        />
      ) : null}
    </>
  );
}
