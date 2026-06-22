// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { LibraryActions } from "./LibraryActions";

const { push, refresh, startNewGameMock, deleteOldGamesMock } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  startNewGameMock: vi.fn(),
  deleteOldGamesMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("./actions", () => ({
  startNewGame: startNewGameMock,
  deleteOldGames: deleteOldGamesMock,
}));

afterEach(() => {
  cleanup();
  push.mockReset();
  refresh.mockReset();
  startNewGameMock.mockReset();
  deleteOldGamesMock.mockReset();
});

describe("LibraryActions", () => {
  it("opens a freshly created campaign when starting a new game", async () => {
    startNewGameMock.mockResolvedValue("new-id");
    render(<LibraryActions deletableCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Start new game" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/play/new-id");
    });
  });

  it("hides the delete control when there are no old games", () => {
    render(<LibraryActions deletableCount={0} />);
    expect(screen.queryByRole("button", { name: "Delete all old games" })).toBeNull();
  });

  it("shows the delete control when old games exist", () => {
    render(<LibraryActions deletableCount={2} />);
    expect(screen.getByRole("button", { name: "Delete all old games" })).toBeTruthy();
  });

  it("asks for confirmation before deleting", () => {
    render(<LibraryActions deletableCount={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete all old games" }));
    expect(screen.getByText(/Delete 2 old campaigns\?/)).toBeTruthy();
  });

  it("does not delete until the confirmation is accepted", () => {
    render(<LibraryActions deletableCount={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete all old games" }));
    expect(deleteOldGamesMock).not.toHaveBeenCalled();
  });

  it("deletes and refreshes once confirmed", async () => {
    deleteOldGamesMock.mockResolvedValue(2);
    render(<LibraryActions deletableCount={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete all old games" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("cancels the confirmation without deleting", () => {
    render(<LibraryActions deletableCount={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete all old games" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/Delete 2 old campaigns\?/)).toBeNull();
  });

  it("uses the singular noun for a single old game", () => {
    render(<LibraryActions deletableCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete all old games" }));
    expect(screen.getByText(/Delete 1 old campaign\?/)).toBeTruthy();
  });
});
