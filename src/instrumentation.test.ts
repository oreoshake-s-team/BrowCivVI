import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ensureMigrated } from "@/server/store";
import { register } from "./instrumentation";

vi.mock("@/server/store", () => ({ ensureMigrated: vi.fn() }));

describe("register", () => {
  const original = process.env.NEXT_RUNTIME;

  beforeEach(() => {
    process.env.NEXT_RUNTIME = "nodejs";
  });

  afterEach(() => {
    process.env.NEXT_RUNTIME = original;
    vi.restoreAllMocks();
  });

  it("does not throw when the startup migration fails", async () => {
    vi.mocked(ensureMigrated).mockRejectedValueOnce(new Error("connect ETIMEDOUT"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(register()).resolves.toBeUndefined();
  });
});
