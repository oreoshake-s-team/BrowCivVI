import { test, expect } from "@playwright/test";
import { captureScreenshot } from "./support/screenshot.ts";

test("home library starts a campaign, lists it, and resumes it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your campaigns" })).toBeVisible();

  const startCta = page.getByRole("link", { name: /Start your first campaign/ });
  if (await startCta.isVisible()) {
    await captureScreenshot(page, "home-library-empty");
    await startCta.click();
  } else {
    await page.goto("/play");
  }
  await expect(page).toHaveURL(/\/play/);
  await expect(page.getByRole("img", { name: /Hex map of the Granicus/ })).toBeVisible();

  await page.goto("/");
  const resume = page.getByRole("link", { name: /Turn \d+ \/ \d+/ }).first();
  await expect(resume).toBeVisible();
  await captureScreenshot(page, "home-library-with-game");

  await resume.click();
  await expect(page).toHaveURL(/\/play\/.+/);
});
