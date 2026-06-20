import { describe, expect, it } from "vitest";
import {
  databaseEndpoint,
  migrateFailureIsFatal,
  selectMigrateUrl,
  selectRuntimeUrl,
} from "./migrateUrl.ts";

const NEON_POOLED =
  "postgresql://u:p@ep-purple-sea-atdby62c-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";
const NEON_DIRECT =
  "postgresql://u:p@ep-purple-sea-atdby62c.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";
const NEON_OTHER =
  "postgresql://u:p@ep-floral-shape-ahtzp1is.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

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

describe("selectRuntimeUrl", () => {
  it("uses the pooled DATABASE_URL in production", () => {
    expect(selectRuntimeUrl({ DATABASE_URL: "postgres://pooled" })).toBe("postgres://pooled");
  });

  it("prefers the shared preview URL in preview deployments", () => {
    expect(
      selectRuntimeUrl({
        VERCEL_ENV: "preview",
        SHARED_PREVIEW_DATABASE_URL: "postgres://shared",
        DATABASE_URL: "postgres://per-deployment",
      }),
    ).toBe("postgres://shared");
  });

  it("returns undefined when no runtime URL is configured", () => {
    expect(selectRuntimeUrl({})).toBeUndefined();
  });
});

describe("databaseEndpoint", () => {
  it("normalizes the pooled and direct endpoints of one database to the same value", () => {
    expect(databaseEndpoint(NEON_POOLED)).toBe(databaseEndpoint(NEON_DIRECT));
  });

  it("distinguishes different database endpoints", () => {
    expect(databaseEndpoint(NEON_DIRECT)).not.toBe(databaseEndpoint(NEON_OTHER));
  });

  it("returns undefined for an unparseable url", () => {
    expect(databaseEndpoint("not a url")).toBeUndefined();
  });
});

describe("migrateFailureIsFatal", () => {
  it("treats a failed migration as fatal on production builds", () => {
    expect(migrateFailureIsFatal({ VERCEL_ENV: "production" })).toBe(true);
  });

  it("treats a failed migration as non-fatal on preview builds", () => {
    expect(migrateFailureIsFatal({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("treats a failed migration as non-fatal on local builds", () => {
    expect(migrateFailureIsFatal({})).toBe(false);
  });
});
