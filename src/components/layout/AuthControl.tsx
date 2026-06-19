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

  const appBaseUrl = process.env.APP_BASE_URL;
  const logoutHref = appBaseUrl
    ? `/auth/logout?returnTo=${encodeURIComponent(appBaseUrl)}`
    : "/auth/logout";

  return (
    <div className={styles.signedIn}>
      <span className={styles.name}>{user.name ?? user.email ?? "Signed in"}</span>
      <a className={styles.action} href={logoutHref}>
        Sign out
      </a>
    </div>
  );
}
