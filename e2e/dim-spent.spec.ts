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

async function resolveDivergence(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /The Granicus/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /attack across the river/i }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog).toBeHidden();
}

test("a player unit that exhausts its movement is dimmed on the board", async ({ page }) => {
  await page.goto("/play");
  await dismissDivergenceIfPresent(page);

  await page.getByRole("button", { name: "New game" }).click();
  await page.getByRole("button", { name: "Yes" }).click();
  await resolveDivergence(page);

  await captureScreenshot(page, "dim-spent-before");

  await page.locator('[data-unit-id="mac-archers"]').click();
  await page.locator('[data-hex="3,0"]').click();

  await expect(page.locator('[data-spent="mac-archers"]')).toBeVisible({ timeout: 30000 });
  await captureScreenshot(page, "dim-spent-after");
});
