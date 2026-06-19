import { createHmac, randomBytes } from "node:crypto";

export const IDENTITY_COOKIE = "bcv_id";

const SECRET = process.env.SESSION_SECRET ?? "browcivvi-dev-secret";

function sign(id: string): string {
  return createHmac("sha256", SECRET).update(id).digest("base64url");
}

export function signIdentity(id: string): string {
  return `${id}.${sign(id)}`;
}

export function verifyIdentity(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  return signIdentity(id) === value ? id : null;
}

export function newIdentityId(): string {
  return randomBytes(16).toString("hex");
}
