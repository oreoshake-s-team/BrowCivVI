import { afterEach, describe, expect, it, vi } from "vitest";
import { requirePlayAccess } from "./authGate";

const { redirectMock, isConfiguredMock, getUserIdMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  isConfiguredMock: vi.fn(),
  getUserIdMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/auth0", () => ({ isAuthConfigured: isConfiguredMock }));
vi.mock("@/server/session", () => ({ getUserId: getUserIdMock }));

afterEach(() => {
  redirectMock.mockReset();
  isConfiguredMock.mockReset();
  getUserIdMock.mockReset();
});

describe("requirePlayAccess", () => {
  it("redirects an unauthenticated visitor to login, returning to the requested path", async () => {
    isConfiguredMock.mockReturnValue(true);
    getUserIdMock.mockResolvedValue(null);
    await requirePlayAccess("/play/abc");
    expect(redirectMock).toHaveBeenCalledWith("/auth/login?returnTo=%2Fplay%2Fabc");
  });

  it("does not redirect an authenticated visitor", async () => {
    isConfiguredMock.mockReturnValue(true);
    getUserIdMock.mockResolvedValue("auth0|alexander");
    await requirePlayAccess("/play");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not gate play when Auth0 is not configured", async () => {
    isConfiguredMock.mockReturnValue(false);
    await requirePlayAccess("/play");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
