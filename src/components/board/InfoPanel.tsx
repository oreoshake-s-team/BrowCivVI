import type { Unit } from "@/engine/unit/types";
import { unitTypeById } from "@/engine/unit/catalog";
import styles from "./HexBoard.module.css";

const FACTION_NAMES: Readonly<Record<string, string>> = {
  macedon: "Macedon",
  persia: "Persia",
};

export function InfoPanel({ unit }: { unit: Unit | null }) {
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
      </dl>
    </section>
  );
}
