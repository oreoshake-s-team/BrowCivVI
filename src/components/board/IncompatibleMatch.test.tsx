// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IncompatibleMatch } from "./IncompatibleMatch";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

describe("IncompatibleMatch", () => {
  it("explains that the saved game uses an older format", () => {
    render(<IncompatibleMatch onStartNewGame={() => undefined} />);
    expect(screen.getByText(/older format/i)).not.toBeNull();
  });

  it("starts a new game when the button is pressed", () => {
    const onStartNewGame = vi.fn();
    render(<IncompatibleMatch onStartNewGame={onStartNewGame} />);
    fireEvent.click(screen.getByRole("button", { name: "Start new game" }));
    expect(onStartNewGame).toHaveBeenCalledTimes(1);
  });
});
