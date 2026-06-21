import Link from "next/link";
import styles from "./IncompatibleMatch.module.css";

export interface IncompatibleMatchProps {
  readonly onStartNewGame: () => void;
}

export function IncompatibleMatch({ onStartNewGame }: IncompatibleMatchProps) {
  return (
    <div className={styles.panel} role="alert">
      <h2 className={styles.heading}>This campaign predates city capture</h2>
      <p className={styles.body}>
        This saved game began before cities could be besieged and captured, so it can’t continue
        under the current rules. Start a new game to play the updated campaign.
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
