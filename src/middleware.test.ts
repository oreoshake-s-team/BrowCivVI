import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "./middleware";

const { getAuth0Mock } = vi.hoisted(() => ({ getAuth0Mock: vi.fn() }));

vi.mock("@/lib/auth0", () => ({ getAuth0: getAuth0Mock }));

function client(session: unknown) {
  return {
    middleware: () => NextResponse.next(),
    getSession: () => Promise.resolve(session),
  };
}

function request(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`));
}

afterEach(() => {
  getAuth0Mock.mockReset();
});

describe("middleware opt-out auth", () => {
  it("passes requests through when Auth0 is not configured", async () => {
    getAuth0Mock.mockReturnValue(null);
    const res = await middleware(request("/play"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows the public home page without a session", async () => {
    getAuth0Mock.mockReturnValue(client(null));
    const res = await middleware(request("/"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows Auth0 routes without a session", async () => {
    getAuth0Mock.mockReturnValue(client(null));
    const res = await middleware(request("/auth/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects an unauthenticated visitor on a protected route to login", async () => {
    getAuth0Mock.mockReturnValue(client(null));
    const res = await middleware(request("/play"));
    expect(res.headers.get("location")).toBe("http://localhost/auth/login?returnTo=%2Fplay");
  });

  it("allows an authenticated visitor on a protected route", async () => {
    getAuth0Mock.mockReturnValue(client({ user: { sub: "auth0|alexander" } }));
    const res = await middleware(request("/play"));
    expect(res.headers.get("location")).toBeNull();
  });
});
