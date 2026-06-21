import { test, expect, type Page } from "@playwright/test";
import { captureScreenshot } from "./support/screenshot.ts";

async function crossTheGranicus(page: Page): Promise<void> {
  await expect(page.getByRole("img", { name: /Hex map of the Granicus/ })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: /The Granicus/ });
  if ((await dialog.count()) === 0) return;
  await dialog.getByRole("button", { name: /attack across the river/i }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog).toBeHidden();
}

const cutOffUnit = (page: Page) => page.locator("[data-unit-id]:has([data-out-of-supply])").first();
const suppliedUnit = (page: Page) =>
  page.locator("[data-unit-id]:not(:has([data-out-of-supply]))").first();

test("unit panel surfaces supply status, including a cut-off unit", async ({ page }) => {
  await page.goto("/play");
  await crossTheGranicus(page);

  for (let turn = 0; turn < 5 && !(await cutOffUnit(page).count()); turn += 1) {
    await page.getByRole("button", { name: "End turn" }).click();
    await expect(page.getByRole("img", { name: /Hex map of the Granicus/ })).toBeVisible();
  }
  await expect(cutOffUnit(page)).toHaveCount(1);

  const panel = page.getByRole("region", { name: "Selected unit" });

  await suppliedUnit(page).click();
  await expect(panel).toContainText("Supplied");
  await captureScreenshot(page, "unit-panel-supplied");

  await cutOffUnit(page).click();
  await expect(panel).toContainText("Out of supply");
  await captureScreenshot(page, "unit-panel-out-of-supply");
});
