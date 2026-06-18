import type { TerrainType } from "@/engine/map/terrain";
import { TERRAIN_COLORS, TERRAIN_LABELS } from "./palette";
import styles from "./HexBoard.module.css";

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
  return (
    <section className={styles.legend} aria-label="Terrain legend">
      <h2 className={styles.panelHeading}>Terrain</h2>
      <ul className={styles.legendList}>
        {TERRAIN_ORDER.map((terrain) => (
          <li key={terrain} className={styles.legendItem}>
            <span className={styles.swatch} style={{ backgroundColor: TERRAIN_COLORS[terrain] }} />
            {TERRAIN_LABELS[terrain]}
          </li>
        ))}
      </ul>
    </section>
  );
}
