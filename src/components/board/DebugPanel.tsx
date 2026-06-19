import styles from "./HexBoard.module.css";

export default function DebugPanel({
  onToggleQR,
  showQandR,
}: {
  onToggleQR: (v: boolean) => void;
  showQandR: boolean;
}) {
  return (
    <section className={styles.info} aria-label="Debug options">
      <h2 className={styles.panelHeading}>Debug tools</h2>
      <label htmlFor="showQR">Show Q and R coordinates?</label>
      <input
        type="checkbox"
        id="showQR"
        onChange={(e) => {
          onToggleQR(e.target.checked);
        }}
        checked={showQandR}
      />
    </section>
  );
}
