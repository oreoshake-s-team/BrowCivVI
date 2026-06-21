import { GameLibrary } from "@/components/library/GameLibrary";
import { currentTimeMs } from "@/components/library/relativeTime";
import { isAuthConfigured } from "@/lib/auth0";
import { listOwnedSummaries } from "@/server/matchService";
import { getSessionUser, LOCAL_OWNER } from "@/server/session";
import { getStore } from "@/server/store";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const authed = isAuthConfigured();
  const user = authed ? await getSessionUser() : null;

  if (authed && user === null) {
    return (
      <main className={styles.main}>
        <h1>Conquests of Alexander</h1>
        <p>334 BC — the army musters at the Granicus.</p>
        <p>
          <a className={styles.cta} href="/auth/login">
            Sign in to resume your campaigns →
          </a>
        </p>
      </main>
    );
  }

  const owner = user?.sub ?? LOCAL_OWNER;
  const games = await listOwnedSummaries(getStore(), owner);

  return (
    <main className={styles.main}>
      <h1>Conquests of Alexander</h1>
      <p>334 BC — the army musters at the Granicus.</p>
      <h2 className={styles.heading}>Your campaigns</h2>
      <GameLibrary games={games} now={currentTimeMs()} />
    </main>
  );
}
