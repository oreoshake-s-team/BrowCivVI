import type { Hex } from "../hex";
import type { UnitCapability } from "./capabilities";
import { UNIVERSAL_CAPABILITIES, CLASS_CAPABILITIES } from "./capabilities";
import type { UnitClass } from "./classes";

export interface UnitType {
  readonly id: string;
  readonly name: string;
  readonly class: UnitClass;
  readonly movement: number;
  readonly strength: number;
  readonly capabilities?: readonly UnitCapability[];
  readonly abilities?: readonly string[];
  readonly hitAndRun?: boolean;
}

export interface Unit {
  readonly id: string;
  readonly typeId: string;
  readonly owner: string;
  readonly hex: Hex;
  readonly hp: number;
  readonly morale: number;
  readonly supplied: boolean;
  readonly hasMovedThisTurn: boolean;
  readonly hasAttackedThisTurn?: boolean;
}

export function effectiveCapabilities(type: UnitType): ReadonlySet<UnitCapability> {
  return new Set<UnitCapability>([
    ...UNIVERSAL_CAPABILITIES,
    ...CLASS_CAPABILITIES[type.class],
    ...(type.capabilities ?? []),
  ]);
}
