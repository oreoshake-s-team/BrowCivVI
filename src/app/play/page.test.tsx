import { afterEach, describe, expect, it, vi } from "vitest";
import PlayPage from "./page";

const { redirectMock, isConfiguredMock, getUserIdMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  isConfiguredMock: vi.fn(),
  getUserIdMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/auth0", () => ({ isAuthConfigured: isConfiguredMock }));
vi.mock("@/server/session", () => ({ getUserId: getUserIdMock }));
vi.mock("@/components/board/PlayScreen", () => ({ PlayScreen: () => null }));

afterEach(() => {
  redirectMock.mockReset();
  isConfiguredMock.mockReset();
  getUserIdMock.mockReset();
});

describe("PlayPage auth gate", () => {
  it("redirects an unauthenticated visitor to Auth0 login", async () => {
    isConfiguredMock.mockReturnValue(true);
    getUserIdMock.mockResolvedValue(null);
    await PlayPage();
    expect(redirectMock).toHaveBeenCalledWith("/auth/login");
  });

  it("does not redirect an authenticated visitor", async () => {
    isConfiguredMock.mockReturnValue(true);
    getUserIdMock.mockResolvedValue("auth0|alexander");
    await PlayPage();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not gate /play when Auth0 is not configured", async () => {
    isConfiguredMock.mockReturnValue(false);
    await PlayPage();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
