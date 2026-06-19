import { describe, it, expect } from "vitest";
import { signIdentity, verifyIdentity, newIdentityId } from "./identity";

describe("identity signing", () => {
  it("verifies a value it signed", () => {
    expect(verifyIdentity(signIdentity("abc"))).toBe("abc");
  });

  it("rejects a tampered signature", () => {
    expect(verifyIdentity("abc.deadbeef")).toBeNull();
  });

  it("rejects a value with no signature", () => {
    expect(verifyIdentity("abc")).toBeNull();
  });

  it("mints distinct ids", () => {
    expect(newIdentityId()).not.toBe(newIdentityId());
  });
});
