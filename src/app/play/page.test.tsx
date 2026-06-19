import { afterEach, describe, expect, it, vi } from "vitest";
import PlayMatchPage from "./[id]/page";
import PlayPage from "./page";

const { requirePlayAccessMock } = vi.hoisted(() => ({ requirePlayAccessMock: vi.fn() }));

vi.mock("./authGate", () => ({ requirePlayAccess: requirePlayAccessMock }));
vi.mock("@/components/board/PlayScreen", () => ({ PlayScreen: () => null }));

afterEach(() => {
  requirePlayAccessMock.mockReset();
});

describe("play routes auth gate", () => {
  it("gates /play before rendering the board", async () => {
    await PlayPage();
    expect(requirePlayAccessMock).toHaveBeenCalledWith("/play");
  });

  it("gates /play/[id] before rendering the board, returning to that match", async () => {
    await PlayMatchPage({ params: Promise.resolve({ id: "match-7" }) });
    expect(requirePlayAccessMock).toHaveBeenCalledWith("/play/match-7");
  });
});
