// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import type { MatchSummary } from "@/server/matchService";
import { GameLibrary } from "./GameLibrary";

afterEach(cleanup);

const NOW = 1_000_000_000_000;

const GAME: MatchSummary = {
  id: "game-1",
  turn: 4,
  turnLimit: 20,
  score: 330,
  updatedAt: NOW - 2 * 24 * 60 * 60_000,
};

describe("GameLibrary", () => {
  it("links each game to its resume route", () => {
    render(<GameLibrary games={[GAME]} now={NOW} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/play/game-1");
  });

  it("shows the turn progress for a game", () => {
    render(<GameLibrary games={[GAME]} now={NOW} />);
    expect(screen.getByText("Turn 4 / 20")).toBeTruthy();
  });

  it("shows when the game was last played", () => {
    render(<GameLibrary games={[GAME]} now={NOW} />);
    expect(screen.getByText("2 days ago")).toBeTruthy();
  });

  it("offers a start-a-campaign call to action when empty", () => {
    render(<GameLibrary games={[]} now={NOW} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/play");
  });
});
