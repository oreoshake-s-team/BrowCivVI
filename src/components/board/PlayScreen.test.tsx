// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/play/actions";
import { PlayScreen } from "./PlayScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

vi.mock("@/app/play/actions", () => ({
  loadBoard: vi.fn(),
  newGame: vi.fn(),
  reachableFor: vi.fn(),
  targetsFor: vi.fn(),
  move: vi.fn(),
  attack: vi.fn(),
  attackCity: vi.fn(),
  defend: vi.fn(),
  incite: vi.fn(),
  endTurn: vi.fn(),
  resolveDivergence: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(actions.loadBoard).mockReturnValue(new Promise(() => undefined));
});

describe("PlayScreen chrome", () => {
  it("shows the scenario heading", () => {
    render(<PlayScreen />);
    expect(screen.getByRole("heading", { name: "The Granicus, 334 BC" })).toBeTruthy();
  });

  it("collapses the how-to-play instructions behind a disclosure", () => {
    const { container } = render(<PlayScreen />);
    expect(screen.getByText("How to play")).toBeTruthy();
    expect(container.querySelector("details")?.open).toBe(false);
  });

  it("keeps the move instructions available inside the disclosure", () => {
    render(<PlayScreen />);
    expect(screen.getByText(/scroll the mouse wheel to zoom/)).toBeTruthy();
  });
});
