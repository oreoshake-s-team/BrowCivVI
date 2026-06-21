// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { Legend } from "./Legend";

afterEach(cleanup);

describe("Legend", () => {
  it("hides the terrain list until the legend is expanded", () => {
    render(<Legend />);
    expect(screen.queryByText("Plains")).toBeNull();
  });

  it("marks the toggle collapsed by default", () => {
    render(<Legend />);
    expect(screen.getByRole("button", { name: "Terrain" }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("reveals the terrain swatches when expanded", () => {
    render(<Legend />);
    fireEvent.click(screen.getByRole("button", { name: "Terrain" }));
    expect(screen.getByText("Plains")).toBeTruthy();
  });

  it("marks the toggle expanded after opening", () => {
    render(<Legend />);
    fireEvent.click(screen.getByRole("button", { name: "Terrain" }));
    expect(screen.getByRole("button", { name: "Terrain" }).getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("collapses the terrain list again on a second toggle", () => {
    render(<Legend />);
    const toggle = screen.getByRole("button", { name: "Terrain" });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.queryByText("Plains")).toBeNull();
  });
});
