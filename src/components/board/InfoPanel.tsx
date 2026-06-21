import { unitTypeById } from "@/engine/unit/catalog";
import type { Unit } from "@/engine/unit/types";
import styles from "./HexBoard.module.css";
import { FACTION_NAMES } from "./palette";

export interface MovesInfo {
  readonly remaining: number;
  readonly max: number;
}

export function InfoPanel({ unit, moves = null }: { unit: Unit | null; moves?: MovesInfo | null }) {
  if (unit === null) {
    return (
      <section className={styles.info} aria-label="Selected unit">
        <p className={styles.infoEmpty}>Select a unit to inspect it.</p>
      </section>
    );
  }
  const type = unitTypeById(unit.typeId);
  return (
    <section className={styles.info} aria-label="Selected unit">
      <h2 className={styles.panelHeading}>{type?.name ?? unit.typeId}</h2>
      <dl className={styles.stats}>
        <dt>Faction</dt>
        <dd>{FACTION_NAMES[unit.owner] ?? unit.owner}</dd>
        <dt>Class</dt>
        <dd>{type?.class ?? "unknown"}</dd>
        <dt>HP</dt>
        <dd>{unit.hp}</dd>
        <dt>Morale</dt>
        <dd>{unit.morale}</dd>
        {moves !== null ? (
          <>
            <dt>Moves</dt>
            <dd className={moves.remaining === 0 ? styles.statSpent : undefined}>
              {moves.remaining} / {moves.max}
            </dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
