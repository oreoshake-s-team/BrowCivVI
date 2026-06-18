import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, relative), "utf8");

const themeSource = read("globals.css");

const definedTokens = new Set(
  [...themeSource.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
);

const referencedTokens = (source: string) =>
  new Set([...source.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((match) => match[1]));

const boardReferences = [
  ...referencedTokens(read("../components/board/HexBoard.module.css")),
  ...referencedTokens(read("../components/board/palette.ts")),
];

describe("design token theme", () => {
  it("defines every token the board references", () => {
    const undefinedTokens = boardReferences.filter((token) => !definedTokens.has(token));
    expect(undefinedTokens).toEqual([]);
  });

  it("emits unused tokens by declaring the theme static", () => {
    expect(themeSource).toMatch(/@theme\s+static\s*\{/);
  });
});
