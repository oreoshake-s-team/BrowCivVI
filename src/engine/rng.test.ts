import { describe, it, expect } from "vitest";
import { createRng, randomInt } from "./rng";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    expect(createRng(42)()).toBe(createRng(42)());
  });

  it("produces values in the [0, 1) range", () => {
    const value = createRng(7)();
    expect(value >= 0 && value < 1).toBe(true);
  });

  it("diverges for different seeds", () => {
    expect(createRng(1)() === createRng(2)()).toBe(false);
  });

  it("reproduces the same sequence from the same seed", () => {
    const a = createRng(99);
    const b = createRng(99);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("randomInt", () => {
  it("stays within [0, maxExclusive)", () => {
    const n = randomInt(createRng(3), 6);
    expect(n >= 0 && n < 6).toBe(true);
  });
});
