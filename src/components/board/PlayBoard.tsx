"use client";

import { useState } from "react";
import type { GameMap } from "@/engine/map/types";
import type { Hex } from "@/engine/hex";
import type { Unit } from "@/engine/unit/types";
import type { NamedRegion } from "@/engine/content/region";
import { hexKey } from "@/engine/map/types";
import { unitTypeById } from "@/engine/unit/catalog";
import { fetchReachable, submitMove } from "@/app/play/actions";
import { HexBoard } from "./HexBoard";

function initialRemaining(units: readonly Unit[]): Record<string, number> {
  const remaining: Record<string, number> = {};
  for (const unit of units) {
    remaining[unit.id] = unitTypeById(unit.typeId)?.movement ?? 0;
  }
  return remaining;
}

export interface PlayBoardProps {
  readonly map: GameMap;
  readonly units: readonly Unit[];
  readonly regions?: readonly NamedRegion[];
}

export function PlayBoard({ map, units: initialUnits, regions = [] }: PlayBoardProps) {
  const [units, setUnits] = useState<readonly Unit[]>(initialUnits);
  const [remaining, setRemaining] = useState<Record<string, number>>(() => initialRemaining(initialUnits));
  const [reachable, setReachable] = useState<readonly Hex[]>([]);

  const occupiedExcept = (unitId: string): readonly string[] =>
    units.filter((unit) => unit.id !== unitId).map((unit) => hexKey(unit.hex));

  const handleSelect = async (unitId: string | null) => {
    if (unitId === null) {
      setReachable([]);
      return;
    }
    const unit = units.find((candidate) => candidate.id === unitId);
    if (unit === undefined) return;
    const moves = await fetchReachable({
      typeId: unit.typeId,
      from: unit.hex,
      movement: remaining[unit.id] ?? 0,
      occupied: occupiedExcept(unit.id),
    });
    setReachable(moves);
  };

  const handleMove = async (unitId: string, to: Hex) => {
    const unit = units.find((candidate) => candidate.id === unitId);
    if (unit === undefined) return;
    const { result, reachable: nextReachable } = await submitMove({
      unitId,
      typeId: unit.typeId,
      from: unit.hex,
      to,
      movement: remaining[unitId] ?? 0,
      occupied: occupiedExcept(unitId),
    });
    if (!result.ok) return;
    setUnits((current) => current.map((u) => (u.id === unitId ? { ...u, hex: result.hex } : u)));
    setRemaining((current) => ({ ...current, [unitId]: result.remaining }));
    setReachable(nextReachable);
  };

  return (
    <HexBoard
      map={map}
      units={units}
      regions={regions}
      reachable={reachable}
      onSelect={handleSelect}
      onMove={handleMove}
    />
  );
}
