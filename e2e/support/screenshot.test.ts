import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Page } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureScreenshot } from "./screenshot.ts";

describe("captureScreenshot", () => {
  let dir: string;
  const screenshot = vi.fn();
  const page = { screenshot } as unknown as Page;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "screenshot-"));
    screenshot.mockClear();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns the slugified path inside the target directory", async () => {
    const file = await captureScreenshot(page, "Turn Bar", dir);
    expect(file).toBe(path.join(dir, "turn-bar.png"));
  });

  it("captures the full page to that path", async () => {
    const file = await captureScreenshot(page, "Turn Bar", dir);
    expect(screenshot).toHaveBeenCalledWith({ path: file, fullPage: true });
  });
});
