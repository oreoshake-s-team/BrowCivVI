import Link from "next/link";
import styles from "./BoardLoadError.module.css";

export type BoardLoadFailure = "not-found" | "error";

export interface BoardLoadErrorProps {
  readonly reason: BoardLoadFailure;
  readonly onRetry: () => void;
}

export function BoardLoadError({ reason, onRetry }: BoardLoadErrorProps) {
  const notFound = reason === "not-found";
  return (
    <div className={styles.panel} role="alert">
      <h2 className={styles.heading}>
        {notFound ? "No such campaign" : "The campaign map was lost"}
      </h2>
      <p className={styles.body}>
        {notFound
          ? "This campaign has faded from the annals — it may have ended, or never began."
          : "We could not reach the field. Check your connection and rally again."}
      </p>
      <div className={styles.actions}>
        {notFound ? (
          <Link className={styles.primary} href="/play">
            Start a new campaign
          </Link>
        ) : (
          <button className={styles.primary} type="button" onClick={onRetry}>
            Retry
          </button>
        )}
        <Link className={styles.secondary} href="/">
          ← Home
        </Link>
      </div>
    </div>
  );
}
