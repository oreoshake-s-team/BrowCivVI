import { describe, it, expect } from "vitest";
import { GREAT_GENERALS, greatGeneralByTypeId } from "./greatGenerals";

describe("greatGeneralByTypeId", () => {
  it("resolves Parmenion as a Macedonian general", () => {
    expect(greatGeneralByTypeId("parmenion")?.faction).toBe("macedon");
  });

  it("returns undefined for a non-general unit type", () => {
    expect(greatGeneralByTypeId("pezhetairos")).toBeUndefined();
  });

  it("gives Parmenion a defensive aura with a positive radius", () => {
    expect(GREAT_GENERALS.parmenion?.aura.radius).toBeGreaterThan(0);
  });

  it("makes Parmenion's aura a defensive strength bonus above one", () => {
    expect(GREAT_GENERALS.parmenion?.aura.defenderStrengthMultiplier).toBeGreaterThan(1);
  });

  it("backs Parmenion with a primary-source citation", () => {
    expect(GREAT_GENERALS.parmenion?.citation.source.type).toBe("primary");
  });
});
