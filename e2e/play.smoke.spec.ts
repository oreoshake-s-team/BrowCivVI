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

test("the Granicus river surfaces its related media links", async ({ page }) => {
  await page.goto("/play");

  await page.locator(".river").first().click({ force: true });

  const card = page.getByRole("dialog", { name: "Granicus historical reference" });
  await expect(card).toBeVisible();

  const video = card.getByRole("link", { name: /Kings and Generals/ });
  await expect(video).toHaveAttribute("href", "https://www.youtube.com/watch?v=s40yYSWkrzk");
  await expect(card.getByRole("link", { name: /Tides of History/ })).toBeVisible();
});
