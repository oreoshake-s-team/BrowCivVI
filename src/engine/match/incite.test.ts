import { describe, it, expect } from "vitest";
import type { CityState } from "./cities";
import { applyIncite, canIncite, INCITE_PRESSURE } from "./incite";
import type { MatchState } from "./state";

function city(over: Partial<CityState> = {}): CityState {
  return { id: "town", owner: "persia", hp: 8, loyalty: 0, ...over };
}

function state(
  over: Partial<MatchState> = {},
  cities: readonly CityState[] = [city()],
): MatchState {
  return {
    activeFaction: "macedon",
    incitedThisTurn: false,
    cities,
    ...over,
  } as unknown as MatchState;
}

function loyaltyOf(result: MatchState | null): number {
  return result?.cities.find((c) => c.id === "town")?.loyalty ?? 0;
}

describe("canIncite", () => {
  it("allows the active faction that has not yet incited this turn", () => {
    expect(canIncite(state(), "macedon")).toBe(true);
  });

  it("denies a faction that has already incited this turn", () => {
    expect(canIncite(state({ incitedThisTurn: true }), "macedon")).toBe(false);
  });

  it("denies a faction whose turn it is not", () => {
    expect(canIncite(state(), "persia")).toBe(false);
  });
});

describe("applyIncite", () => {
  it("nudges a city's loyalty toward the inciter", () => {
    expect(loyaltyOf(applyIncite(state(), "macedon", "town"))).toBe(INCITE_PRESSURE);
  });

  it("shores up a wavering owned city back toward its owner", () => {
    const own = state({}, [city({ owner: "macedon", loyalty: -30 })]);
    expect(loyaltyOf(applyIncite(own, "macedon", "town"))).toBe(-30 + INCITE_PRESSURE);
  });

  it("marks the turn's incite as spent", () => {
    expect(applyIncite(state(), "macedon", "town")?.incitedThisTurn).toBe(true);
  });

  it("clamps loyalty at the maximum", () => {
    const high = state({}, [city({ loyalty: 98 })]);
    expect(loyaltyOf(applyIncite(high, "macedon", "town"))).toBe(100);
  });

  it("rejects a second incite in the same turn", () => {
    expect(applyIncite(state({ incitedThisTurn: true }), "macedon", "town")).toBeNull();
  });

  it("rejects inciting out of turn", () => {
    expect(applyIncite(state({ activeFaction: "persia" }), "macedon", "town")).toBeNull();
  });

  it("rejects an unknown city", () => {
    expect(applyIncite(state(), "macedon", "ghost")).toBeNull();
  });
});
