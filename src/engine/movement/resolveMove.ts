import type { Hex } from "../hex";
import type { GameMap } from "../map/types";
import type { MovementDomain } from "../unit/classes";
import { hexKey, parseHexKey } from "../map/types";
import { reachableHexes } from "./reachable";

export interface MoveQuery {
  readonly from: Hex;
  readonly movement: number;
  readonly domain: MovementDomain;
  readonly map: GameMap;
  readonly blocked?: ReadonlySet<string>;
}

export interface MoveRequest extends MoveQuery {
  readonly unitId: string;
  readonly to: Hex;
}

export type MoveResult =
  | { readonly ok: true; readonly unitId: string; readonly hex: Hex; readonly remaining: number }
  | { readonly ok: false; readonly reason: string };

function reachable(query: MoveQuery): ReadonlyMap<string, number> {
  return reachableHexes({
    start: query.from,
    movement: query.movement,
    map: query.map,
    domain: query.domain,
    ...(query.blocked ? { blocked: query.blocked } : {}),
  });
}

export function availableMoves(query: MoveQuery): readonly Hex[] {
  return [...reachable(query).keys()].map(parseHexKey);
}

export function resolveMove(request: MoveRequest): MoveResult {
  const remaining = reachable(request).get(hexKey(request.to));
  if (remaining === undefined) return { ok: false, reason: "unreachable" };
  return { ok: true, unitId: request.unitId, hex: request.to, remaining };
}
