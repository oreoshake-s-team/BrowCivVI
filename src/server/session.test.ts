import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSessionUser,
  getUserId,
  ownerSubject,
  requireUserId,
  LOCAL_OWNER,
  UnauthenticatedError,
} from "./session";

const { getAuth0Mock, isConfiguredMock } = vi.hoisted(() => ({
  getAuth0Mock: vi.fn(),
  isConfiguredMock: vi.fn(() => true),
}));

vi.mock("@/lib/auth0", () => ({
  isAuthConfigured: isConfiguredMock,
  getAuth0: getAuth0Mock,
}));

function withSession(session: unknown): void {
  getAuth0Mock.mockReturnValue({ getSession: () => Promise.resolve(session) });
}

afterEach(() => {
  getAuth0Mock.mockReset();
  isConfiguredMock.mockReturnValue(true);
});

describe("getUserId", () => {
  it("returns the Auth0 sub for an authenticated session", async () => {
    withSession({ user: { sub: "auth0|alexander" } });
    expect(await getUserId()).toBe("auth0|alexander");
  });

  it("returns null when there is no session", async () => {
    withSession(null);
    expect(await getUserId()).toBeNull();
  });

  it("returns null when Auth0 is not configured", async () => {
    getAuth0Mock.mockReturnValue(null);
    expect(await getUserId()).toBeNull();
  });
});

describe("getSessionUser", () => {
  it("maps the display name and email from the session", async () => {
    withSession({ user: { sub: "auth0|1", name: "Alexander", email: "a@macedon.gr" } });
    expect(await getSessionUser()).toEqual({
      sub: "auth0|1",
      name: "Alexander",
      email: "a@macedon.gr",
    });
  });
});

describe("requireUserId", () => {
  it("returns the userId for an authenticated session", async () => {
    withSession({ user: { sub: "auth0|1" } });
    expect(await requireUserId()).toBe("auth0|1");
  });

  it("rejects an unauthenticated request", async () => {
    withSession(null);
    await expect(requireUserId()).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe("ownerSubject", () => {
  it("uses the authenticated userId when auth is configured", async () => {
    withSession({ user: { sub: "auth0|1" } });
    expect(await ownerSubject()).toBe("auth0|1");
  });

  it("rejects an unauthenticated request when auth is configured", async () => {
    withSession(null);
    await expect(ownerSubject()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("falls back to a local owner when auth is not configured", async () => {
    isConfiguredMock.mockReturnValue(false);
    expect(await ownerSubject()).toBe(LOCAL_OWNER);
  });
});
