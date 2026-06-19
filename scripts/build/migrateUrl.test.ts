import { describe, expect, it } from "vitest";
import { selectMigrateUrl } from "./migrateUrl.ts";

describe("selectMigrateUrl", () => {
  it("prefers the unpooled connection for migrations", () => {
    expect(
      selectMigrateUrl({
        DATABASE_URL_UNPOOLED: "postgres://direct",
        DATABASE_URL: "postgres://pooled",
      }),
    ).toBe("postgres://direct");
  });

  it("falls back to the pooled connection when no unpooled URL is set", () => {
    expect(selectMigrateUrl({ DATABASE_URL: "postgres://pooled" })).toBe("postgres://pooled");
  });

  it("ignores blank values", () => {
    expect(
      selectMigrateUrl({ DATABASE_URL_UNPOOLED: "  ", DATABASE_URL: "postgres://pooled" }),
    ).toBe("postgres://pooled");
  });

  it("returns undefined when no database URL is configured", () => {
    expect(selectMigrateUrl({})).toBeUndefined();
  });

  it("migrates the shared preview branch instead of the per-deployment branch in preview", () => {
    expect(
      selectMigrateUrl({
        VERCEL_ENV: "preview",
        SHARED_PREVIEW_DATABASE_URL_UNPOOLED: "postgres://shared-direct",
        DATABASE_URL_UNPOOLED: "postgres://per-deployment-direct",
      }),
    ).toBe("postgres://shared-direct");
  });

  it("falls back to the injected connection in preview when no shared preview URL is set", () => {
    expect(
      selectMigrateUrl({
        VERCEL_ENV: "preview",
        DATABASE_URL_UNPOOLED: "postgres://per-deployment-direct",
      }),
    ).toBe("postgres://per-deployment-direct");
  });

  it("ignores the shared preview URL outside of preview deployments", () => {
    expect(
      selectMigrateUrl({
        SHARED_PREVIEW_DATABASE_URL_UNPOOLED: "postgres://shared-direct",
        DATABASE_URL_UNPOOLED: "postgres://direct",
      }),
    ).toBe("postgres://direct");
  });
});
