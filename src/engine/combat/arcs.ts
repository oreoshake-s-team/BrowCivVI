import type { Hex, HexDirection } from "../hex";
import { directionTo } from "../hex";

export type CombatArc = "front" | "flank" | "rear";

export function arcFromDirections(facing: HexDirection, incoming: HexDirection): CombatArc {
  const raw = (incoming - facing + 6) % 6;
  const distance = Math.min(raw, 6 - raw);
  if (distance === 0) return "front";
  if (distance === 3) return "rear";
  return "flank";
}

export function combatArc(
  defenderFacing: HexDirection,
  defenderHex: Hex,
  attackerHex: Hex,
): CombatArc | null {
  const incoming = directionTo(defenderHex, attackerHex);
  return incoming === null ? null : arcFromDirections(defenderFacing, incoming);
}
