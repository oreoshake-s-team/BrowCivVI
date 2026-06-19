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
});
