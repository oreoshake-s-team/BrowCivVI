import { describe, it, expect } from "vitest";
import { domainForClass } from "./classes";

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
