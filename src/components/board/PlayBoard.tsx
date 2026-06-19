"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadBoard, targetsFor, move, attack, newGame } from "@/app/play/actions";
import type { NamedRegion } from "@/engine/content/region";
import type { Hex } from "@/engine/hex";
import { hexKey } from "@/engine/map/types";
import type { GameMap } from "@/engine/map/types";
import type { Unit } from "@/engine/unit/types";
import { HexBoard, type DamageFloater } from "./HexBoard";
import styles from "./PlayBoard.module.css";
import { Toast } from "./Toast";

const FLOATER_MS = 1100;
const FADE_MS = 500;

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
  const [attackable, setAttackable] = useState<readonly Hex[]>([]);
  const [floaters, setFloaters] = useState<readonly DamageFloater[]>([]);
  const [fadingUnits, setFadingUnits] = useState<readonly Unit[]>([]);
  const [ready, setReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const floaterSeq = useRef(0);

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
      setReachable(outcome.reachable);
    } else {
      setUnits(previous);
      setToast("Move rejected — the board changed. Try again.");
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
      setToast("Attack rejected — the board changed. Try again.");
      return;
    }
    const previous = units;
    setUnits(outcome.units);
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
    setMatchId(board.matchId);
    clearTargets();
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
