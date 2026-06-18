import { readFileSync, globSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findRawColorLiterals, findRawBorderRadii } from "./cssGuards";

const srcRoot = resolve(import.meta.dirname, "..");
const moduleStyles = globSync("**/*.module.css", { cwd: srcRoot }).map((rel) => ({
  rel,
  css: readFileSync(resolve(srcRoot, rel), "utf8"),
}));

describe("component CSS stays token-based", () => {
  it("scans at least one component stylesheet", () => {
    expect(moduleStyles.length).toBeGreaterThan(0);
  });

  it("uses no raw color literals", () => {
    const offenders = moduleStyles.flatMap(({ rel, css }) =>
      findRawColorLiterals(css).map((literal) => `${rel}: ${literal}`),
    );
    expect(offenders).toEqual([]);
  });

  it("uses tokens for every border-radius", () => {
    const offenders = moduleStyles.flatMap(({ rel, css }) =>
      findRawBorderRadii(css).map((decl) => `${rel}: ${decl}`),
    );
    expect(offenders).toEqual([]);
  });
});

describe("board palette stays token-based", () => {
  const paletteSource = readFileSync(
    resolve(srcRoot, "components/board/palette.ts"),
    "utf8",
  );

  it("declares no raw color literals", () => {
    expect(findRawColorLiterals(paletteSource)).toEqual([]);
  });
});

describe("the guards detect raw values", () => {
  it("flags a hardcoded hex color", () => {
    expect(findRawColorLiterals(".a { color: #1b1b1b; }")).toContain("#1b1b1b");
  });

  it("flags a functional color literal", () => {
    expect(findRawColorLiterals(".a { fill: rgba(212, 175, 55, 0.38); }")).toContain(
      "rgba(",
    );
  });

  it("flags a raw pixel border-radius", () => {
    expect(findRawBorderRadii(".a { border-radius: 8px; }")).toEqual([
      "border-radius: 8px",
    ]);
  });

  it("accepts a tokenized border-radius", () => {
    expect(findRawBorderRadii(".a { border-radius: var(--radius-md); }")).toEqual([]);
  });
});
