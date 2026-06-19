"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadBoard, reachableFor, move, newGame } from "@/app/play/actions";
import type { NamedRegion } from "@/engine/content/region";
import type { Hex } from "@/engine/hex";
import type { GameMap } from "@/engine/map/types";
import type { Unit } from "@/engine/unit/types";
import { HexBoard } from "./HexBoard";
import styles from "./PlayBoard.module.css";
import { Toast } from "./Toast";

export interface PlayBoardProps {
  readonly map: GameMap;
  readonly regions?: readonly NamedRegion[];
  readonly initialMatchId?: string | undefined;
}

export function PlayBoard({ map, regions = [], initialMatchId }: PlayBoardProps) {
  const router = useRouter();
  const [matchId, setMatchId] = useState<string | null>(initialMatchId ?? null);
  const [units, setUnits] = useState<readonly Unit[]>([]);
  const [reachable, setReachable] = useState<readonly Hex[]>([]);
  const [ready, setReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadBoard(initialMatchId).then((board) => {
      if (!active) return;
      setUnits(board.units);
      setMatchId(board.matchId);
      setReady(true);
      if (board.matchId !== initialMatchId) router.replace(`/play/${board.matchId}`);
    });
    return () => {
      active = false;
    };
  }, [initialMatchId, router]);

  useEffect(() => {
    if (toast === null) return undefined;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [toast]);

  const handleSelect = async (unitId: string | null) => {
    if (unitId === null || matchId === null) {
      setReachable([]);
      return;
    }
    setReachable(await reachableFor(matchId, unitId));
  };

  const handleMove = async (unitId: string, to: Hex) => {
    if (matchId === null) return;
    const previous = units;
    setUnits(units.map((unit) => (unit.id === unitId ? { ...unit, hex: to } : unit)));
    setReachable([]);
    const outcome = await move(matchId, unitId, to);
    if (outcome.ok) {
      setUnits(outcome.units);
      setReachable(outcome.reachable);
    } else {
      setUnits(previous);
      setToast("Move rejected — the board changed. Try again.");
    }
  };

  const startNewGame = async () => {
    setConfirming(false);
    const board = await newGame();
    setUnits(board.units);
    setMatchId(board.matchId);
    setReachable([]);
    router.push(`/play/${board.matchId}`);
  };

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
        reachable={reachable}
        onSelect={(unitId) => void handleSelect(unitId)}
        onMove={(unitId, to) => void handleMove(unitId, to)}
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
