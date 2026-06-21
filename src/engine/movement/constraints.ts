import { hexKey } from "../map/types";
import { unitTypeById } from "../unit/catalog";
import type { MovementDomain, StackingLayer } from "../unit/classes";
import { domainForClass, ignoresZoneOfControl, stackingLayerForClass } from "../unit/classes";
import type { Unit } from "../unit/types";
import { enemyZoneOfControl } from "./zoneOfControl";

const NO_ZONE_OF_CONTROL: ReadonlySet<string> = new Set<string>();

export interface MovementConstraints {
  readonly blocked: ReadonlySet<string>;
  readonly blockedDestinations: ReadonlySet<string>;
  readonly zoneOfControl: ReadonlySet<string>;
}

export function domainOf(typeId: string): MovementDomain {
  const type = unitTypeById(typeId);
  return type ? domainForClass(type.class) : "land";
}

export function layerOf(typeId: string): StackingLayer {
  const type = unitTypeById(typeId);
  return type ? stackingLayerForClass(type.class) : "military";
}

export function movementConstraints(
  units: readonly Unit[],
  unit: Unit,
  riverEdges: ReadonlySet<string>,
): MovementConstraints {
  const moverLayer = layerOf(unit.typeId);
  const blocked = new Set<string>();
  const blockedDestinations = new Set<string>();
  for (const other of units) {
    if (other.id === unit.id) continue;
    if (other.owner !== unit.owner) blocked.add(hexKey(other.hex));
    else if (layerOf(other.typeId) === moverLayer) blockedDestinations.add(hexKey(other.hex));
  }
  const moverClass = unitTypeById(unit.typeId)?.class;
  const zoneOfControl =
    moverClass !== undefined && ignoresZoneOfControl(moverClass)
      ? NO_ZONE_OF_CONTROL
      : enemyZoneOfControl(
          units,
          unit.owner,
          (typeId) => layerOf(typeId) === "military",
          riverEdges,
        );
  return { blocked, blockedDestinations, zoneOfControl };
}
