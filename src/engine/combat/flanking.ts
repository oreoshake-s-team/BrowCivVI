import type { Hex } from "../hex";

export function oppositeHex(defender: Hex, attacker: Hex): Hex {
  return { q: 2 * defender.q - attacker.q, r: 2 * defender.r - attacker.r };
}

export function isFlanked(
  defender: Hex,
  attacker: Hex,
  hasAttackerAlly: (hex: Hex) => boolean,
): boolean {
  return hasAttackerAlly(oppositeHex(defender, attacker));
}
