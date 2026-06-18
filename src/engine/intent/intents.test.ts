import { describe, it, expect } from "vitest";
import { SETTLER, ARCHER, CATAPULT, GREAT_GENERAL, PHALANGITE } from "../unit/fixtures";
import { availableIntentKinds } from "./intents";

describe("availableIntentKinds", () => {
  it("lets a settler settle", () => {
    expect(availableIntentKinds(SETTLER)).toContain("settle");
  });

  it("lets a settler move", () => {
    expect(availableIntentKinds(SETTLER)).toContain("moveUnit");
  });

  it("does not let a settler attack", () => {
    expect(availableIntentKinds(SETTLER)).not.toContain("attack");
  });

  it("maps a ranged unit's attack capability to the attack intent", () => {
    expect(availableIntentKinds(ARCHER)).toContain("attack");
  });

  it("maps a siege unit's bombard capability to the attack intent", () => {
    expect(availableIntentKinds(CATAPULT)).toContain("attack");
  });

  it("maps a melee unit's attack capability to the attack intent", () => {
    expect(availableIntentKinds(PHALANGITE)).toContain("attack");
  });

  it("gives a support unit only movement (heal is passive)", () => {
    expect(availableIntentKinds(GREAT_GENERAL)).toEqual(["moveUnit"]);
  });
});
