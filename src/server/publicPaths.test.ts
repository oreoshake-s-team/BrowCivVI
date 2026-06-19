import { describe, expect, it } from "vitest";
import { isPublicPath } from "./publicPaths";

describe("isPublicPath", () => {
  it("treats the home page as public", () => {
    expect(isPublicPath("/")).toBe(true);
  });

  it("treats Auth0 routes as public", () => {
    expect(isPublicPath("/auth/login")).toBe(true);
  });

  it("gates the play route", () => {
    expect(isPublicPath("/play")).toBe(false);
  });

  it("gates a specific match route", () => {
    expect(isPublicPath("/play/abc")).toBe(false);
  });
});
