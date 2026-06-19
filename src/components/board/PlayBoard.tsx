"use client";

import { useEffect, useState } from "react";
import { loadBoard, reachableFor, move } from "@/app/play/actions";
import type { NamedRegion } from "@/engine/content/region";
import type { Hex } from "@/engine/hex";
import type { GameMap } from "@/engine/map/types";
import type { Unit } from "@/engine/unit/types";
import { HexBoard } from "./HexBoard";

export interface PlayBoardProps {
  readonly map: GameMap;
  readonly regions?: readonly NamedRegion[];
}

export function PlayBoard({ map, regions = [] }: PlayBoardProps) {
  const [units, setUnits] = useState<readonly Unit[]>([]);
  const [reachable, setReachable] = useState<readonly Hex[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void loadBoard().then((board) => {
      if (active) {
        setUnits(board.units);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = async (unitId: string | null) => {
    setReachable(unitId === null ? [] : await reachableFor(unitId));
  };

  const handleMove = async (unitId: string, to: Hex) => {
    const result = await move(unitId, to);
    setUnits(result.units);
    setReachable(result.reachable);
  };

  if (!ready) return <p role="status">Loading the campaign…</p>;

  return (
    <HexBoard
      map={map}
      units={units}
      regions={regions}
      reachable={reachable}
      onSelect={(unitId) => void handleSelect(unitId)}
      onMove={(unitId, to) => void handleMove(unitId, to)}
    />
  );
}
