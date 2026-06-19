// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthControl } from "./AuthControl";

const { isConfiguredMock, getSessionUserMock } = vi.hoisted(() => ({
  isConfiguredMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/auth0", () => ({ isAuthConfigured: isConfiguredMock }));
vi.mock("@/server/session", () => ({ getSessionUser: getSessionUserMock }));

afterEach(() => {
  cleanup();
  isConfiguredMock.mockReset();
  getSessionUserMock.mockReset();
});

describe("AuthControl", () => {
  it("renders nothing when Auth0 is not configured", async () => {
    isConfiguredMock.mockReturnValue(false);
    expect(await AuthControl()).toBeNull();
  });

  it("renders a Sign in link when no session exists", async () => {
    isConfiguredMock.mockReturnValue(true);
    getSessionUserMock.mockResolvedValue(null);
    render(await AuthControl());
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/auth/login");
  });

  it("renders the display name when signed in", async () => {
    isConfiguredMock.mockReturnValue(true);
    getSessionUserMock.mockResolvedValue({ sub: "auth0|1", name: "Alexander" });
    render(await AuthControl());
    expect(screen.getByText("Alexander")).not.toBeNull();
  });

  it("renders a Sign out link when signed in", async () => {
    isConfiguredMock.mockReturnValue(true);
    getSessionUserMock.mockResolvedValue({ sub: "auth0|1", name: "Alexander" });
    render(await AuthControl());
    expect(screen.getByRole("link", { name: "Sign out" }).getAttribute("href")).toBe(
      "/auth/logout",
    );
  });
});
