import { neighbors } from "../hex";
import { hexKey } from "../map/types";
import type { Unit } from "../unit/types";
import { riverEdgeKey } from "./cost";

export function enemyZoneOfControl(
  units: readonly Unit[],
  viewerOwner: string,
  isMilitary: (typeId: string) => boolean,
  riverEdges: ReadonlySet<string>,
): ReadonlySet<string> {
  const zoc = new Set<string>();
  for (const unit of units) {
    if (unit.owner === viewerOwner || !isMilitary(unit.typeId)) continue;
    for (const hex of neighbors(unit.hex)) {
      if (!riverEdges.has(riverEdgeKey(unit.hex, hex))) zoc.add(hexKey(hex));
    }
  }
  return zoc;
}
