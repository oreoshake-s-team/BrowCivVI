import type { Hex } from "../hex";
import type { UnitCapability } from "../unit/capabilities";
import type { UnitType } from "../unit/types";
import { effectiveCapabilities } from "../unit/types";

export type IntentKind = "moveUnit" | "attack" | "settle" | "incite" | "scorch" | "endTurn";

export type Intent =
  | { readonly kind: "moveUnit"; readonly unitId: string; readonly to: Hex }
  | { readonly kind: "attack"; readonly unitId: string; readonly target: Hex }
  | { readonly kind: "settle"; readonly unitId: string }
  | { readonly kind: "incite"; readonly cityId: string }
  | { readonly kind: "scorch"; readonly hex: Hex }
  | { readonly kind: "endTurn" };

const CAPABILITY_INTENTS: Partial<Record<UnitCapability, IntentKind>> = {
  move: "moveUnit",
  meleeAttack: "attack",
  rangedAttack: "attack",
  bombard: "attack",
  settle: "settle",
};

export function availableIntentKinds(type: UnitType): readonly IntentKind[] {
  const kinds = new Set<IntentKind>();
  for (const capability of effectiveCapabilities(type)) {
    const kind = CAPABILITY_INTENTS[capability];
    if (kind) kinds.add(kind);
  }
  return [...kinds];
}
