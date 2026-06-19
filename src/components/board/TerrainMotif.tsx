import type { ReactNode } from "react";
import type { TerrainType } from "@/engine/map/terrain";
import styles from "./TerrainMotif.module.css";

const water: ReactNode = (
  <>
    <path className={styles.wave} d="M-0.34 -0.04 q0.085 -0.11 0.17 0 t0.17 0" />
    <path className={styles.wave} d="M-0.34 0.14 q0.085 -0.11 0.17 0 t0.17 0" />
  </>
);

const MOTIFS: Partial<Record<TerrainType, ReactNode>> = {
  mountain: (
    <>
      <path
        className={styles.rock}
        d="M-0.42 0.18 L-0.16 -0.24 L0 -0.02 L0.18 -0.28 L0.42 0.18 Z"
      />
      <path className={styles.snow} d="M0.1 -0.14 L0.18 -0.28 L0.26 -0.14 Z" />
    </>
  ),
  forest: (
    <>
      <path className={styles.foliage} d="M-0.14 -0.18 L0 0.1 L-0.28 0.1 Z" />
      <path className={styles.foliage} d="M0.16 -0.06 L0.3 0.16 L0.02 0.16 Z" />
    </>
  ),
  hills: (
    <>
      <path className={styles.hill} d="M-0.34 0.06 a0.17 0.16 0 0 1 0.34 0" />
      <path className={styles.hill} d="M-0.02 0.06 a0.16 0.15 0 0 1 0.32 0" />
    </>
  ),
  coast: water,
  deepSea: water,
};

export interface TerrainMotifProps {
  readonly terrain: TerrainType;
  readonly cx: number;
  readonly cy: number;
  readonly size: number;
}

export function TerrainMotif({ terrain, cx, cy, size }: TerrainMotifProps) {
  const motif = MOTIFS[terrain];
  if (motif === undefined) return null;
  return (
    <g
      className={styles.motif}
      data-motif={terrain}
      transform={`translate(${cx}, ${cy}) scale(${size})`}
      aria-hidden="true"
    >
      {motif}
    </g>
  );
}
