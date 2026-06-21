import { attritionRate, OUT_OF_SUPPLY_MORALE } from "@/engine/supply/attrition";
import { unitTypeById } from "@/engine/unit/catalog";
import type { Unit } from "@/engine/unit/types";
import styles from "./HexBoard.module.css";
import { FACTION_NAMES } from "./palette";

export interface MovesInfo {
  readonly remaining: number;
  readonly max: number;
}

function SupplyValue({ unit }: { unit: Unit }) {
  if (unit.supplied) return <>Supplied</>;
  const hpLoss = attritionRate((unit.outOfSupplyTurns ?? 0) + 1);
  return (
    <>
      <span aria-hidden="true">⊘</span> Out of supply — −{hpLoss} HP, −{OUT_OF_SUPPLY_MORALE} morale
      next turn
    </>
  );
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
        <dt>Supply</dt>
        <dd className={unit.supplied ? undefined : styles.statOutOfSupply}>
          <SupplyValue unit={unit} />
        </dd>
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
