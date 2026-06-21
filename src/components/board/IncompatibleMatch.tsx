import Link from "next/link";
import styles from "./IncompatibleMatch.module.css";

export interface IncompatibleMatchProps {
  readonly onStartNewGame: () => void;
}

export function IncompatibleMatch({ onStartNewGame }: IncompatibleMatchProps) {
  return (
    <div className={styles.panel} role="alert">
      <h2 className={styles.heading}>This campaign is out of date</h2>
      <p className={styles.body}>
        This saved game uses an older format from a previous version and can’t continue under the
        current rules. Start a new game to play the latest campaign.
      </p>
      <div className={styles.actions}>
        <button className={styles.primary} type="button" onClick={onStartNewGame}>
          Start new game
        </button>
        <Link className={styles.secondary} href="/">
          ← Home
        </Link>
      </div>
    </div>
  );
}
