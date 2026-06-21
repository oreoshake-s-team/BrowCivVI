import { describe, it, expect } from "vitest";
import { domainForClass, ignoresZoneOfControl, stackingLayerForClass } from "./classes";

describe("domainForClass", () => {
  it("places land classes in the land domain", () => {
    expect(domainForClass("melee")).toBe("land");
  });

  it("places siege in the land domain", () => {
    expect(domainForClass("siege")).toBe("land");
  });

  it("places naval classes in the naval domain", () => {
    expect(domainForClass("navalRanged")).toBe("naval");
  });
});

describe("stackingLayerForClass", () => {
  it("places civilian units on the civilian layer", () => {
    expect(stackingLayerForClass("civilian")).toBe("civilian");
  });

  it("places combat units on the military layer", () => {
    expect(stackingLayerForClass("heavyCavalry")).toBe("military");
  });
});

describe("ignoresZoneOfControl", () => {
  it("exempts light cavalry", () => {
    expect(ignoresZoneOfControl("lightCavalry")).toBe(true);
  });

  it("exempts heavy cavalry", () => {
    expect(ignoresZoneOfControl("heavyCavalry")).toBe(true);
  });

  it("does not exempt melee infantry", () => {
    expect(ignoresZoneOfControl("melee")).toBe(false);
  });

  it("does not exempt anti-cavalry", () => {
    expect(ignoresZoneOfControl("antiCavalry")).toBe(false);
  });
});
