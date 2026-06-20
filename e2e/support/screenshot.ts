import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import { DEFAULT_SCREENSHOT_DIR, screenshotFileName } from "../../scripts/screenshots/capture.ts";

export async function captureScreenshot(
  page: Page,
  name: string,
  dir: string = DEFAULT_SCREENSHOT_DIR,
): Promise<string> {
  const file = path.join(dir, screenshotFileName(name));
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true });
  return file;
}
