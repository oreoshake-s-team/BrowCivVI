import { redirect } from "next/navigation";
import { isAuthConfigured } from "@/lib/auth0";
import { getUserId } from "@/server/session";

export async function requirePlayAccess(returnTo: string): Promise<void> {
  if (isAuthConfigured() && (await getUserId()) === null) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
}
