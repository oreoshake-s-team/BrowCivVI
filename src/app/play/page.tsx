import { redirect } from "next/navigation";
import { PlayScreen } from "@/components/board/PlayScreen";
import { isAuthConfigured } from "@/lib/auth0";
import { getUserId } from "@/server/session";

export const metadata = {
  title: "Play — Conquests of Alexander",
};

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  if (isAuthConfigured() && (await getUserId()) === null) {
    redirect("/auth/login");
  }
  return <PlayScreen />;
}
