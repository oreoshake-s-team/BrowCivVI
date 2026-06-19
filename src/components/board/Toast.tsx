import styles from "./Toast.module.css";

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className={styles.toast} role="alert">
      <span>{message}</span>
      <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
