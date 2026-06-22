import styles from "./HexBoard.module.css";
import { FACTION_NAMES } from "./palette";

export interface CityPanelInfo {
  readonly id: string;
  readonly name: string;
  readonly owner: string | null;
  readonly loyalty: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly wavering: boolean;
  readonly scorchedAdjacent: boolean;
}

function ownerName(owner: string | null): string {
  return owner === null ? "Neutral" : (FACTION_NAMES[owner] ?? owner);
}

function loyaltyLabel(loyalty: number): string {
  const leaning = loyalty > 0 ? "Macedon" : loyalty < 0 ? "Persia" : "contested";
  const signed = loyalty > 0 ? `+${loyalty}` : `${loyalty}`;
  return loyalty === 0 ? "0 (contested)" : `${signed} (${leaning})`;
}

export function CityPanel({
  city,
  canIncite,
  onIncite,
}: {
  readonly city: CityPanelInfo;
  readonly canIncite: boolean;
  readonly onIncite: ((cityId: string) => void) | undefined;
}) {
  return (
    <section className={styles.info} aria-label="Selected city">
      <h2 className={styles.panelHeading}>{city.name}</h2>
      <dl className={styles.stats}>
        <dt>Owner</dt>
        <dd>{ownerName(city.owner)}</dd>
        <dt>Loyalty</dt>
        <dd>{loyaltyLabel(city.loyalty)}</dd>
        <dt>HP</dt>
        <dd>
          {city.hp} / {city.maxHp}
        </dd>
        {city.wavering ? (
          <>
            <dt>Status</dt>
            <dd className={styles.statOutOfSupply}>Wavering — near defection</dd>
          </>
        ) : null}
        {city.scorchedAdjacent ? (
          <>
            <dt>Supply</dt>
            <dd>Scorched land nearby</dd>
          </>
        ) : null}
      </dl>
      <button
        type="button"
        className={styles.inciteButton}
        disabled={!canIncite}
        onClick={() => onIncite?.(city.id)}
      >
        Incite
      </button>
      {!canIncite ? <p className={styles.inciteHint}>Incite already used this turn.</p> : null}
    </section>
  );
}
