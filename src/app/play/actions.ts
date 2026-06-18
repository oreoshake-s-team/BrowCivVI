"use server";

import { FIRST_SLICE_MAP } from "@/content/firstSlice";
import type { Hex } from "@/engine/hex";
import type { MoveResult } from "@/engine/movement/resolveMove";
import { availableMoves, resolveMove } from "@/engine/movement/resolveMove";
import { unitTypeById } from "@/engine/unit/catalog";
import type { MovementDomain } from "@/engine/unit/classes";
import { domainForClass } from "@/engine/unit/classes";

export interface MoveIntent {
  readonly typeId: string;
  readonly from: Hex;
  readonly movement: number;
  readonly occupied: readonly string[];
}

function domainOf(typeId: string): MovementDomain {
  const type = unitTypeById(typeId);
  return type ? domainForClass(type.class) : "land";
}

export async function fetchReachable(intent: MoveIntent): Promise<readonly Hex[]> {
  return availableMoves({
    from: intent.from,
    movement: intent.movement,
    domain: domainOf(intent.typeId),
    map: FIRST_SLICE_MAP,
    blocked: new Set(intent.occupied),
  });
}

export async function submitMove(
  intent: MoveIntent & { readonly unitId: string; readonly to: Hex },
): Promise<{ readonly result: MoveResult; readonly reachable: readonly Hex[] }> {
  const domain = domainOf(intent.typeId);
  const blocked = new Set(intent.occupied);
  const result = resolveMove({
    unitId: intent.unitId,
    from: intent.from,
    to: intent.to,
    movement: intent.movement,
    domain,
    map: FIRST_SLICE_MAP,
    blocked,
  });
  if (!result.ok) return { result, reachable: [] };
  const reachable = availableMoves({
    from: result.hex,
    movement: result.remaining,
    domain,
    map: FIRST_SLICE_MAP,
    blocked,
  });
  return { result, reachable };
}
