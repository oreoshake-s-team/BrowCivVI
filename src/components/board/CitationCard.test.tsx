// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import type { Citation } from "@/engine/content/citation";
import type { MediaLink } from "@/engine/content/media";
import { CitationCard } from "./CitationCard";

afterEach(cleanup);

const MEDIA: readonly MediaLink[] = [
  {
    id: "granicus-doc",
    title: "Battle of Granicus 334 BC (Kings and Generals)",
    url: "https://www.youtube.com/watch?v=s40yYSWkrzk",
    kind: "video",
  },
];

const CITATION: Citation = {
  claim: "The Granicus rises on Mount Ida and runs to the Propontis.",
  source: {
    title: "Battle of the Granicus",
    url: "https://en.wikipedia.org/wiki/Battle_of_the_Granicus",
    type: "primary",
  },
  confidence: "high",
};

const noop = () => undefined;

function renderCard(
  citation: Citation = CITATION,
  onClose: () => void = noop,
  media?: readonly MediaLink[],
) {
  return render(
    <CitationCard
      name="Granicus"
      citation={citation}
      x={10}
      y={20}
      onClose={onClose}
      onMouseEnter={noop}
      onMouseLeave={noop}
      media={media}
    />,
  );
}

describe("CitationCard", () => {
  it("shows the cited claim", () => {
    renderCard();
    expect(
      screen.getByText("The Granicus rises on Mount Ida and runs to the Propontis."),
    ).toBeTruthy();
  });

  it("opens the source in a new tab", () => {
    renderCard();
    expect(
      screen.getByRole("link", { name: "Battle of the Granicus" }).getAttribute("target"),
    ).toBe("_blank");
  });

  it("labels the source type", () => {
    renderCard();
    expect(screen.getByText("Primary source", { exact: false })).toBeTruthy();
  });

  it("surfaces the source confidence", () => {
    renderCard();
    expect(screen.getByText("high")).toBeTruthy();
  });

  it("renders the source as plain text when it has no url", () => {
    renderCard({ ...CITATION, source: { title: "Arrian, Anabasis", type: "primary" } });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("invokes onClose from the close button", () => {
    const onClose = vi.fn();
    renderCard(CITATION, onClose);
    fireEvent.click(screen.getByRole("button", { name: "Close reference" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("links out to related media when provided", () => {
    renderCard(CITATION, noop, MEDIA);
    expect(
      screen
        .getByRole("link", { name: "Video Battle of Granicus 334 BC (Kings and Generals)" })
        .getAttribute("href"),
    ).toBe("https://www.youtube.com/watch?v=s40yYSWkrzk");
  });

  it("omits the media list when no related media is provided", () => {
    renderCard();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
