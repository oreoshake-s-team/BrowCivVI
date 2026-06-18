import type { Hex, HexDirection } from "../hex";
import type { UnitClass } from "./classes";
import type { UnitCapability } from "./capabilities";
import { DEFAULT_CAPABILITIES } from "./capabilities";

export interface UnitType {
  readonly id: string;
  readonly name: string;
  readonly class: UnitClass;
  readonly movement: number;
  readonly strength: number;
  readonly capabilities?: readonly UnitCapability[];
  readonly abilities?: readonly string[];
}

export interface Unit {
  readonly id: string;
  readonly typeId: string;
  readonly owner: string;
  readonly hex: Hex;
  readonly facing: HexDirection;
  readonly hp: number;
  readonly morale: number;
  readonly supplied: boolean;
  readonly hasMovedThisTurn: boolean;
}

export function effectiveCapabilities(type: UnitType): ReadonlySet<UnitCapability> {
  return new Set<UnitCapability>([...DEFAULT_CAPABILITIES[type.class], ...(type.capabilities ?? [])]);
}
