import { fortifyStrengthBonus } from "@/engine/combat/fortify";
import { attritionRate, OUT_OF_SUPPLY_MORALE } from "@/engine/supply/attrition";
import { unitTypeById } from "@/engine/unit/catalog";
import type { Unit } from "@/engine/unit/types";
import styles from "./HexBoard.module.css";
import { FACTION_NAMES } from "./palette";

export interface MovesInfo {
  readonly remaining: number;
  readonly max: number;
}

export interface InfoPanelProps {
  readonly unit: Unit | null;
  readonly moves?: MovesInfo | null;
  readonly canDefend?: boolean;
  readonly onDefend?: ((unitId: string) => void) | undefined;
}

function SupplyRow({ unit }: { unit: Unit }) {
  if (unit.supplied) return null;
  const hpLoss = attritionRate((unit.outOfSupplyTurns ?? 0) + 1);
  return (
    <>
      <dt>Supply</dt>
      <dd className={styles.statOutOfSupply}>
        <span aria-hidden="true">⊘</span> Out of supply — −{hpLoss} HP, −{OUT_OF_SUPPLY_MORALE}{" "}
        morale next turn
        <span className={styles.supplyHint}>
          Cut off from supply — it keeps losing HP and morale every turn until it reconnects.
        </span>
      </dd>
    </>
  );
}

export function InfoPanel({ unit, moves = null, canDefend = false, onDefend }: InfoPanelProps) {
  if (unit === null) {
    return (
      <section className={styles.info} aria-label="Selected unit">
        <p className={styles.infoEmpty}>Select a unit to inspect it.</p>
      </section>
    );
  }
  const type = unitTypeById(unit.typeId);
  const fortifyBonus = unit.fortifiedTurns ? fortifyStrengthBonus(unit.fortifiedTurns) : 0;
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
        <SupplyRow unit={unit} />
        {fortifyBonus > 0 ? (
          <>
            <dt>Defense</dt>
            <dd>Fortified +{fortifyBonus}</dd>
          </>
        ) : null}
        {moves !== null ? (
          <>
            <dt>Moves</dt>
            <dd className={moves.remaining === 0 ? styles.statSpent : undefined}>
              {moves.remaining} / {moves.max}
            </dd>
          </>
        ) : null}
      </dl>
      {canDefend && onDefend ? (
        <button
          type="button"
          className={styles.defendButton}
          onClick={() => {
            onDefend(unit.id);
          }}
        >
          Defend (F)
        </button>
      ) : null}
    </section>
  );
}
