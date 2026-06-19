import { ensureMigrated } from "@/server/store";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    await ensureMigrated();
  } catch (error) {
    console.error("Startup database migration deferred; will retry on first store use.", error);
  }
}
