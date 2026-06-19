import { Auth0Client } from "@auth0/nextjs-auth0/server";

const REQUIRED_ENV = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
] as const;

export function isAuthConfigured(): boolean {
  return REQUIRED_ENV.every((key) => Boolean(process.env[key]));
}

let client: Auth0Client | null = null;

export function getAuth0(): Auth0Client | null {
  if (!isAuthConfigured()) return null;
  client ??= new Auth0Client();
  return client;
}
