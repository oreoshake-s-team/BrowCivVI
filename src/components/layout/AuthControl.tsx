import { isAuthConfigured } from "@/lib/auth0";
import { getSessionUser } from "@/server/session";
import styles from "./AuthControl.module.css";

export async function AuthControl() {
  if (!isAuthConfigured()) return null;

  const user = await getSessionUser();
  if (user === null) {
    return (
      <a className={styles.action} href="/auth/login">
        Sign in
      </a>
    );
  }

  return (
    <div className={styles.signedIn}>
      <span className={styles.name}>{user.name ?? user.email ?? "Signed in"}</span>
      <a className={styles.action} href="/auth/logout">
        Sign out
      </a>
    </div>
  );
}
