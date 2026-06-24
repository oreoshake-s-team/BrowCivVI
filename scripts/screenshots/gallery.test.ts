import { describe, expect, it } from "vitest";
import {
  prFolderName,
  renderPrIndexHtml,
  renderRootIndexHtml,
  slugify,
  type PrScreenshotMeta,
  type RootGalleryEntry,
} from "./gallery.ts";

const baseMeta: PrScreenshotMeta = {
  pr: 7,
  date: "2026-06-19",
  repo: "oreoshake-s-team/BrowCivVI",
  images: ["before.png", "after.png"],
};

describe("prFolderName", () => {
  it("prefixes the ISO date and zero-pads the PR for chronological sorting", () => {
    expect(prFolderName({ date: "2026-06-19", pr: 7, title: "Royal Road redeploy" })).toBe(
      "2026-06-19-pr-0007-royal-road-redeploy",
    );
  });

  it("omits the slug when no title is given", () => {
    expect(prFolderName({ date: "2026-06-19", pr: 42 })).toBe("2026-06-19-pr-0042");
  });
});

describe("slugify", () => {
  it("lowercases and collapses non-alphanumerics into single hyphens", () => {
    expect(slugify("  Hetairoi & Hypaspists!! ")).toBe("hetairoi-hypaspists");
  });
});

describe("renderPrIndexHtml", () => {
  it("links to the pull request", () => {
    expect(renderPrIndexHtml(baseMeta)).toContain(
      "https://github.com/oreoshake-s-team/BrowCivVI/pull/7",
    );
  });

  it("links to the issue when provided", () => {
    expect(renderPrIndexHtml({ ...baseMeta, issue: 12 })).toContain(
      "https://github.com/oreoshake-s-team/BrowCivVI/issues/12",
    );
  });

  it("omits the issue link when no issue is given", () => {
    expect(renderPrIndexHtml(baseMeta)).not.toContain("/issues/");
  });

  it("renders one figure per screenshot", () => {
    expect(renderPrIndexHtml(baseMeta).match(/<figure>/g)).toHaveLength(2);
  });

  it("links each thumbnail to its fullscreen lightbox target", () => {
    expect(renderPrIndexHtml(baseMeta)).toContain('<a class="thumb" href="#shot-1">');
  });

  it("renders a fullscreen lightbox overlay per screenshot", () => {
    expect(renderPrIndexHtml(baseMeta).match(/<a class="lightbox"/g)).toHaveLength(2);
  });

  it("closes the lightbox by linking the overlay back to no target", () => {
    expect(renderPrIndexHtml(baseMeta)).toContain('<a class="lightbox" id="shot-1" href="#">');
  });

  it("escapes HTML in the title", () => {
    expect(renderPrIndexHtml({ ...baseMeta, title: "<script>alert(1)</script>" })).not.toContain(
      "<script>",
    );
  });
});

describe("renderRootIndexHtml", () => {
  it("lists the newest PR folder first", () => {
    const entries: RootGalleryEntry[] = [
      { folder: "2026-06-10-pr-0003", meta: { ...baseMeta, pr: 3, date: "2026-06-10" } },
      { folder: "2026-06-19-pr-0007", meta: { ...baseMeta, pr: 7, date: "2026-06-19" } },
    ];
    const html = renderRootIndexHtml(entries);
    expect(html.indexOf("2026-06-19-pr-0007")).toBeLessThan(html.indexOf("2026-06-10-pr-0003"));
  });

  it("starts each card on its own line so concurrent PRs do not collide", () => {
    const entries: RootGalleryEntry[] = [
      { folder: "2026-06-10-pr-0003", meta: { ...baseMeta, pr: 3, date: "2026-06-10" } },
      { folder: "2026-06-19-pr-0007", meta: { ...baseMeta, pr: 7, date: "2026-06-19" } },
    ];
    expect(renderRootIndexHtml(entries).match(/^<a class="card"/gm)).toHaveLength(2);
  });
});
