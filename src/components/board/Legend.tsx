"use client";

import { useId, useState } from "react";
import type { TerrainType } from "@/engine/map/terrain";
import styles from "./HexBoard.module.css";
import { TERRAIN_COLORS, TERRAIN_LABELS } from "./palette";

const TERRAIN_ORDER: readonly TerrainType[] = [
  "plains",
  "hills",
  "forest",
  "marsh",
  "desert",
  "mountain",
  "coast",
  "deepSea",
];

export function Legend() {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <section className={styles.legend} aria-label="Terrain legend">
      <button
        type="button"
        className={styles.legendToggle}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <span>Terrain</span>
        <span className={styles.legendChevron} aria-hidden="true" data-open={open || undefined}>
          ▸
        </span>
      </button>
      {open ? (
        <ul id={listId} className={styles.legendList}>
          {TERRAIN_ORDER.map((terrain) => (
            <li key={terrain} className={styles.legendItem}>
              <span
                className={styles.swatch}
                style={{ backgroundColor: TERRAIN_COLORS[terrain] }}
              />
              {TERRAIN_LABELS[terrain]}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
