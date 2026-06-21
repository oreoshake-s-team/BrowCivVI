import { test, expect, type Page } from "@playwright/test";

// The default match is shared across these smoke tests, so the one-shot Granicus
// divergence node is only pending for whichever test reaches /play first. Resolve
// it when present so the board underneath is interactive; the modal's own
// behaviour is covered by the PlayBoard component tests.
async function dismissDivergenceIfPresent(page: Page): Promise<void> {
  await expect(page.getByRole("img", { name: /Hex map of the Granicus/ })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: /The Granicus/ });
  if ((await dialog.count()) === 0) return;
  // Reckless keeps the army's move points; the cautious choice forfeits the turn.
  await dialog.getByRole("button", { name: /attack across the river/i }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog).toBeHidden();
}

test("the Granicus board renders and selecting a unit reveals its reachable hexes", async ({
  page,
}) => {
  await page.goto("/play");
  await dismissDivergenceIfPresent(page);

  const unit = page.locator("[data-unit-id]").first();
  await expect(unit).toBeVisible();
  await unit.click();

  await expect(page.locator(".reach").first()).toBeVisible();
});

test("the Granicus river surfaces its related media links", async ({ page }) => {
  await page.goto("/play");
  await dismissDivergenceIfPresent(page);

  const card = page.getByRole("dialog", { name: "Granicus historical reference" });
  await expect(async () => {
    await page.locator(".river").first().click({ force: true });
    await expect(card).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });

  const video = card.getByRole("link", { name: /Kings and Generals/ });
  await expect(video).toHaveAttribute("href", "https://www.youtube.com/watch?v=s40yYSWkrzk");
  await expect(card.getByRole("link", { name: /Tides of History/ })).toBeVisible();
});

test("Pella surfaces its pre-Granicus media reference", async ({ page }) => {
  await page.goto("/play");
  await dismissDivergenceIfPresent(page);

  const card = page.getByRole("dialog", { name: "Pella historical reference" });
  await expect(async () => {
    await page.getByRole("button", { name: "Pella historical reference" }).click();
    await expect(card).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });

  await expect(card.getByRole("link", { name: /Kings and Generals/ })).toBeVisible();
});
