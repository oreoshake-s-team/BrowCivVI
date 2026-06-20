export function migrateFailureIsFatal(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === "production";
}

export function selectMigrateUrl(env: Record<string, string | undefined>): string | undefined {
  const keys =
    env.VERCEL_ENV === "preview"
      ? [
          "SHARED_PREVIEW_DATABASE_URL_UNPOOLED",
          "SHARED_PREVIEW_DATABASE_URL",
          "DATABASE_URL_UNPOOLED",
          "DATABASE_URL",
        ]
      : ["DATABASE_URL_UNPOOLED", "DATABASE_URL"];
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}

export function selectRuntimeUrl(env: Record<string, string | undefined>): string | undefined {
  const keys =
    env.VERCEL_ENV === "preview"
      ? ["SHARED_PREVIEW_DATABASE_URL", "DATABASE_URL"]
      : ["DATABASE_URL"];
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}

export function databaseEndpoint(url: string): string | undefined {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return undefined;
  }
  return hostname.replace(/-pooler\./, ".");
}
