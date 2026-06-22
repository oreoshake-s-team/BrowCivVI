import { test, expect, type Page } from "@playwright/test";
import { captureScreenshot } from "./support/screenshot.ts";

async function dismissDivergenceIfPresent(page: Page): Promise<void> {
  await expect(page.getByRole("img", { name: /Hex map of the Granicus/ })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: /The Granicus/ });
  if ((await dialog.count()) === 0) return;
  await dialog.getByRole("button", { name: /attack across the river/i }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog).toBeHidden();
}

test("the Persian Royal Road renders on the board", async ({ page }) => {
  await page.goto("/play");
  await dismissDivergenceIfPresent(page);

  await expect(page.locator('[data-road="royal"]').first()).toBeAttached();
  await captureScreenshot(page, "royal-road");
});
