import Link from "next/link";
import { AuthControl } from "./AuthControl";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        Conquests of Alexander
      </Link>
      <nav className={styles.nav}>
        <AuthControl />
      </nav>
    </header>
  );
}
