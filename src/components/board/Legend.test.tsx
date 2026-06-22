// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { Legend } from "./Legend";

afterEach(cleanup);
beforeEach(() => {
  window.localStorage.clear();
});

describe("Legend", () => {
  it("opens expanded on a first visit", () => {
    render(<Legend />);
    expect(screen.getByText("Plains")).toBeTruthy();
  });

  it("marks the toggle expanded on a first visit", () => {
    render(<Legend />);
    expect(screen.getByRole("button", { name: "Legend" }).getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("hides the keys after collapsing", () => {
    render(<Legend />);
    fireEvent.click(screen.getByRole("button", { name: "Legend" }));
    expect(screen.queryByText("Plains")).toBeNull();
  });

  it("remembers a collapsed choice across mounts", () => {
    const first = render(<Legend />);
    fireEvent.click(screen.getByRole("button", { name: "Legend" }));
    first.unmount();
    render(<Legend />);
    expect(screen.queryByText("Plains")).toBeNull();
  });

  it("keys the neutral allegiance", () => {
    render(<Legend />);
    expect(screen.getByText("Neutral")).toBeTruthy();
  });

  it("keys a unit class present on the board", () => {
    render(<Legend unitClasses={["heavyCavalry"]} />);
    expect(screen.getByText("Heavy cavalry")).toBeTruthy();
  });

  it("omits the units group when no unit classes are present", () => {
    render(<Legend />);
    expect(screen.queryByText("Units")).toBeNull();
  });

  it("omits a unit class that is not on the board", () => {
    render(<Legend unitClasses={["heavyCavalry"]} />);
    expect(screen.queryByText("Siege")).toBeNull();
  });
});
