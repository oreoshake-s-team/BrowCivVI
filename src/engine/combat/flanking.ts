import type { Hex, HexDirection } from "../hex";
import { directionTo, neighbor } from "../hex";

export function oppositeHex(defender: Hex, attacker: Hex): Hex | null {
  const dir = directionTo(defender, attacker);
  if (dir === null) return null;
  const opposite = ((dir + 3) % 6) as HexDirection;
  return neighbor(defender, opposite);
}

export function isFlanked(
  defender: Hex,
  attacker: Hex,
  hasAttackerAlly: (hex: Hex) => boolean,
): boolean {
  const opposite = oppositeHex(defender, attacker);
  return opposite !== null && hasAttackerAlly(opposite);
}
