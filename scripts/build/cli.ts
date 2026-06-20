import { execFileSync } from "node:child_process";
import {
  databaseEndpoint,
  migrateFailureIsFatal,
  selectMigrateUrl,
  selectRuntimeUrl,
} from "./migrateUrl.ts";

function run(args: string[], env: NodeJS.ProcessEnv): void {
  execFileSync("pnpm", ["exec", ...args], { stdio: "inherit", env });
}

function assertEndpointsAgree(migrateUrl: string): void {
  const runtimeUrl = selectRuntimeUrl(process.env);
  if (runtimeUrl === undefined) return;
  const migrateHost = databaseEndpoint(migrateUrl);
  const runtimeHost = databaseEndpoint(runtimeUrl);
  if (migrateHost !== undefined && runtimeHost !== undefined && migrateHost !== runtimeHost) {
    console.error(
      `build: FATAL — migration target (${migrateHost}) and runtime target (${runtimeHost}) are ` +
        `different database endpoints. Refusing to build to avoid migrating the wrong database; ` +
        `point DATABASE_URL and DATABASE_URL_UNPOOLED at the same Neon endpoint.`,
    );
    process.exit(1);
  }
}

function main(): void {
  const migrateUrl = selectMigrateUrl(process.env);
  if (migrateUrl === undefined) {
    console.log("build: no database URL configured — skipping prisma migrate deploy");
  } else {
    assertEndpointsAgree(migrateUrl);
    let target = "unknown host";
    try {
      target = new URL(migrateUrl).host;
    } catch {
      target = "unparseable host";
    }
    console.log(`build: applying database migrations (prisma migrate deploy) → ${target}`);
    try {
      run(["prisma", "migrate", "deploy"], { ...process.env, DATABASE_URL: migrateUrl });
    } catch (error) {
      if (migrateFailureIsFatal(process.env)) throw error;
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(
        `build: prisma migrate deploy failed (${detail}); continuing without applied ` +
          `migrations because this is a non-production build`,
      );
    }
  }
  run(["next", "build", "--turbopack"], process.env);
}

main();
