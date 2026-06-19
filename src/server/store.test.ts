import { describe, it, expect } from "vitest";
import { getStore, selectDatabaseUrl } from "./store";

describe("getStore", () => {
  it("falls back to an in-memory store without a database url", async () => {
    expect(await getStore().load("missing")).toBeNull();
  });
});

describe("selectDatabaseUrl", () => {
  it("uses the shared preview branch in preview deployments", () => {
    expect(
      selectDatabaseUrl({
        VERCEL_ENV: "preview",
        SHARED_PREVIEW_DATABASE_URL: "postgres://shared",
        DATABASE_URL: "postgres://per-deployment",
      }),
    ).toBe("postgres://shared");
  });

  it("falls back to the injected database url in preview when no shared url is set", () => {
    expect(
      selectDatabaseUrl({ VERCEL_ENV: "preview", DATABASE_URL: "postgres://per-deployment" }),
    ).toBe("postgres://per-deployment");
  });

  it("ignores the shared preview url in production", () => {
    expect(
      selectDatabaseUrl({
        VERCEL_ENV: "production",
        SHARED_PREVIEW_DATABASE_URL: "postgres://shared",
        DATABASE_URL: "postgres://main",
      }),
    ).toBe("postgres://main");
  });

  it("returns undefined when no database url is configured", () => {
    expect(selectDatabaseUrl({})).toBeUndefined();
  });
});
