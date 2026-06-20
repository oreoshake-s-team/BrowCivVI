import { describe, expect, it } from "vitest";
import { screenshotFileName } from "./capture.ts";

describe("screenshotFileName", () => {
  it("slugifies the screen name into a png filename", () => {
    expect(screenshotFileName("Hex Board — Selected Unit")).toBe("hex-board-selected-unit.png");
  });

  it("falls back to a default name when the input has no usable characters", () => {
    expect(screenshotFileName("!!!")).toBe("screenshot.png");
  });
});
