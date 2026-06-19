import { test, expect } from "@playwright/test";

test("the Granicus board renders and selecting a unit reveals its reachable hexes", async ({
  page,
}) => {
  await page.goto("/play");

  await expect(page.getByRole("img", { name: /Hex map of the Granicus/ })).toBeVisible();

  const unit = page.locator("[data-unit-id]").first();
  await expect(unit).toBeVisible();
  await unit.click();

  await expect(page.locator(".reach").first()).toBeVisible();
});
