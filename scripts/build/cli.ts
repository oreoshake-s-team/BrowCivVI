import { execFileSync } from "node:child_process";
import { selectMigrateUrl } from "./migrateUrl.ts";

function run(args: string[], env: NodeJS.ProcessEnv): void {
  execFileSync("yarn", args, { stdio: "inherit", env });
}

function main(): void {
  const migrateUrl = selectMigrateUrl(process.env);
  if (migrateUrl === undefined) {
    console.log("build: no database URL configured — skipping prisma migrate deploy");
  } else {
    console.log("build: applying database migrations (prisma migrate deploy)");
    run(["prisma", "migrate", "deploy"], { ...process.env, DATABASE_URL: migrateUrl });
  }
  run(["next", "build", "--turbopack"], process.env);
}

main();
