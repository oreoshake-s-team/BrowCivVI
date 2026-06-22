import { test, expect } from "@playwright/test";
import { captureScreenshot } from "./support/screenshot.ts";

test("the home screen offers start-new-game and delete-old-games", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start new game" })).toBeVisible();

  for (let i = 0; i < 2; i += 1) {
    await page.getByRole("button", { name: "Start new game" }).click();
    await expect(page).toHaveURL(/\/play\//);
    await page.goto("/");
  }

  await expect(page.getByRole("button", { name: "Delete all old games" })).toBeVisible();
  await captureScreenshot(page, "home-actions");

  await page.getByRole("button", { name: "Delete all old games" }).click();
  await expect(page.getByText(/Delete \d+ old/)).toBeVisible();
  await captureScreenshot(page, "home-delete-confirm");
});
