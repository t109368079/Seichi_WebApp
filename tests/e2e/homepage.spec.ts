import { expect, test } from "@playwright/test";

test("homepage links to the Phase 1 scene catalog", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Seichi Pilgrimage" }),
  ).toBeVisible();
  await expect(page.getByText("Phase 1 Scene Catalog")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Foundation status" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open scene catalog" }),
  ).toBeVisible();
});
