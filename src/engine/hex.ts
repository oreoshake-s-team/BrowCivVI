export interface Hex {
  readonly q: number;
  readonly r: number;
}

export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

export const HEX_DIRECTION_COUNT = 6;

const OFFSET_DIRECTIONS: readonly [
  readonly [Hex, Hex, Hex, Hex, Hex, Hex],
  readonly [Hex, Hex, Hex, Hex, Hex, Hex],
] = [
  [
    { q: 1, r: 0 },
    { q: 0, r: -1 },
    { q: -1, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ],
  [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: 0, r: 1 },
    { q: 1, r: 1 },
  ],
];

function rowParity(r: number): 0 | 1 {
  return (((r % 2) + 2) % 2) as 0 | 1;
}

export function neighbor(hex: Hex, dir: HexDirection): Hex {
  const step = OFFSET_DIRECTIONS[rowParity(hex.r)][dir];
  return { q: hex.q + step.q, r: hex.r + step.r };
}

export function neighbors(hex: Hex): readonly Hex[] {
  return OFFSET_DIRECTIONS[rowParity(hex.r)].map((step) => ({
    q: hex.q + step.q,
    r: hex.r + step.r,
  }));
}

export function directionTo(from: Hex, to: Hex): HexDirection | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const steps = OFFSET_DIRECTIONS[rowParity(from.r)];
  const index = steps.findIndex((step) => step.q === dq && step.r === dr);
  return index === -1 ? null : (index as HexDirection);
}
