import { describe, it, expect } from "vitest";
import { lazyMigration } from "./migrate";
import type { SqlExecutor } from "./sql";

const isCreate = (text: string): boolean => text.includes("CREATE TABLE");

function fakeExecutor(failCreateTimes = 0): { exec: SqlExecutor; calls: readonly string[] } {
  const calls: string[] = [];
  let failsLeft = failCreateTimes;
  const exec: SqlExecutor = (text) => {
    if (isCreate(text) && failsLeft > 0) {
      failsLeft -= 1;
      return Promise.reject(new Error("connect ETIMEDOUT"));
    }
    calls.push(isCreate(text) ? "create" : "query");
    return Promise.resolve([]);
  };
  return { exec, calls };
}

describe("lazyMigration", () => {
  it("creates the table before the first query runs", async () => {
    const { exec, calls } = fakeExecutor();
    await lazyMigration(exec).executor("SELECT 1", []);
    expect(calls).toEqual(["create", "query"]);
  });

  it("runs the migration only once across multiple queries", async () => {
    const { exec, calls } = fakeExecutor();
    const { executor } = lazyMigration(exec);
    await executor("SELECT 1", []);
    await executor("SELECT 2", []);
    expect(calls.filter((call) => call === "create")).toHaveLength(1);
  });

  it("dedupes the boot migration against a concurrent first query", async () => {
    const { exec, calls } = fakeExecutor();
    const { executor, migrate } = lazyMigration(exec);
    await Promise.all([migrate(), executor("SELECT 1", [])]);
    expect(calls.filter((call) => call === "create")).toHaveLength(1);
  });

  it("retries the migration on the next query after a failed attempt", async () => {
    const { exec, calls } = fakeExecutor(1);
    const { executor } = lazyMigration(exec);
    await expect(executor("SELECT 1", [])).rejects.toThrow();
    await executor("SELECT 1", []);
    expect(calls).toEqual(["create", "query"]);
  });
});
