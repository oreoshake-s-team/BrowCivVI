// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { CityPanel, type CityPanelInfo } from "./CityPanel";

afterEach(cleanup);

function city(over: Partial<CityPanelInfo> = {}): CityPanelInfo {
  return {
    id: "zeleia",
    name: "Zeleia",
    owner: "persia",
    loyalty: -30,
    hp: 40,
    maxHp: 80,
    wavering: false,
    scorchedAdjacent: false,
    ...over,
  };
}

describe("CityPanel", () => {
  it("names the city and its owner", () => {
    render(<CityPanel city={city()} canIncite onIncite={undefined} />);
    expect(screen.getByRole("heading", { name: "Zeleia" })).not.toBeNull();
  });

  it("shows a signed, leaning loyalty readout", () => {
    render(<CityPanel city={city({ loyalty: -30 })} canIncite onIncite={undefined} />);
    expect(screen.getByText("-30 (Persia)")).not.toBeNull();
  });

  it("shows the city's HP out of its max", () => {
    render(<CityPanel city={city({ hp: 40, maxHp: 80 })} canIncite onIncite={undefined} />);
    expect(screen.getByText("40 / 80")).not.toBeNull();
  });

  it("flags a wavering city", () => {
    render(<CityPanel city={city({ wavering: true })} canIncite onIncite={undefined} />);
    expect(screen.getByText(/Wavering/)).not.toBeNull();
  });

  it("notes scorched land nearby", () => {
    render(<CityPanel city={city({ scorchedAdjacent: true })} canIncite onIncite={undefined} />);
    expect(screen.getByText(/Scorched land nearby/)).not.toBeNull();
  });

  it("incites the city when the button is pressed", () => {
    const onIncite = vi.fn();
    render(<CityPanel city={city()} canIncite onIncite={onIncite} />);
    fireEvent.click(screen.getByRole("button", { name: "Incite" }));
    expect(onIncite).toHaveBeenCalledWith("zeleia");
  });

  it("disables the incite button when incite is unavailable", () => {
    render(<CityPanel city={city()} canIncite={false} onIncite={undefined} />);
    expect(screen.getByRole("button", { name: "Incite" })).toHaveProperty("disabled", true);
  });

  it("explains why incite is unavailable", () => {
    render(<CityPanel city={city()} canIncite={false} onIncite={undefined} />);
    expect(screen.getByText(/already used this turn/)).not.toBeNull();
  });
});
