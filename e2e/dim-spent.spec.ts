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

test("units with no actions left are dimmed on the board", async ({ page }) => {
  await page.goto("/play");
  await dismissDivergenceIfPresent(page);
  await captureScreenshot(page, "dim-spent-before");

  await page.getByRole("button", { name: "End turn" }).click();
  const confirm = page.getByText("End turn with units still to act?");
  if ((await confirm.count()) > 0) {
    await page.getByRole("button", { name: "End turn" }).click();
  }

  await expect(page.locator("[data-spent]").first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: "End turn" })).toBeEnabled({ timeout: 30000 });
  await captureScreenshot(page, "dim-spent-after");
});
