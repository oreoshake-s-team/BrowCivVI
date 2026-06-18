export interface Hex {
  readonly q: number;
  readonly r: number;
}

export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

export const HEX_DIRECTIONS: readonly [Hex, Hex, Hex, Hex, Hex, Hex] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function neighbor(hex: Hex, dir: HexDirection): Hex {
  const step = HEX_DIRECTIONS[dir];
  return { q: hex.q + step.q, r: hex.r + step.r };
}

export function directionTo(from: Hex, to: Hex): HexDirection | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const index = HEX_DIRECTIONS.findIndex((step) => step.q === dq && step.r === dr);
  return index === -1 ? null : (index as HexDirection);
}
