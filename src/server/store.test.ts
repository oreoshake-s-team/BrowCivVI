import { describe, it, expect } from "vitest";
import { getStore } from "./store";

describe("getStore", () => {
  it("falls back to an in-memory store without a database url", async () => {
    expect(await getStore().load("missing")).toBeNull();
  });
});
