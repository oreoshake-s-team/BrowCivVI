"use server";

import { createNewMatch, deleteOldMatches } from "@/server/matchService";
import { ownerSubject } from "@/server/session";
import { getStore } from "@/server/store";

export async function startNewGame(): Promise<string> {
  const match = await createNewMatch(getStore(), await ownerSubject());
  return match.id;
}

export async function deleteOldGames(): Promise<number> {
  return deleteOldMatches(getStore(), await ownerSubject());
}
