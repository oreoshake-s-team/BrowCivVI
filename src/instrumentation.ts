import { ensureMigrated } from "@/server/store";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await ensureMigrated();
  }
}
