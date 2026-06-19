import { getAuth0, isAuthConfigured } from "@/lib/auth0";

export const LOCAL_OWNER = "local-dev";

export interface SessionUser {
  readonly sub: string;
  readonly name?: string;
  readonly email?: string;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthenticatedError";
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const auth0 = getAuth0();
  if (auth0 === null) return null;
  const session = await auth0.getSession();
  if (session === null) return null;
  const { sub, name, email } = session.user;
  const user: { sub: string; name?: string; email?: string } = { sub };
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  return user;
}

export async function getUserId(): Promise<string | null> {
  return (await getSessionUser())?.sub ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (userId === null) throw new UnauthenticatedError();
  return userId;
}

export async function ownerSubject(): Promise<string> {
  return isAuthConfigured() ? requireUserId() : LOCAL_OWNER;
}
