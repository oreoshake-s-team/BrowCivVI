export function selectMigrateUrl(env: Record<string, string | undefined>): string | undefined {
  for (const key of ["DATABASE_URL_UNPOOLED", "DATABASE_URL"]) {
    const value = env[key]?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}
