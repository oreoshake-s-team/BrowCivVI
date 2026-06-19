import { PlayScreen } from "@/components/board/PlayScreen";
import { requirePlayAccess } from "./authGate";

export const metadata = {
  title: "Play — Conquests of Alexander",
};

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  await requirePlayAccess("/play");
  return <PlayScreen />;
}
