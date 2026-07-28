import { expect, test } from "@playwright/test";

test("homepage links to scene import and the catalog", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Seichi Pilgrimage" }),
  ).toBeVisible();
  await expect(page.getByText("Phase 2 Scene Import")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Foundation status" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Import scenes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open catalog" })).toBeVisible();
});
