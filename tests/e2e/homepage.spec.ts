import { expect, test } from "@playwright/test";

test("homepage renders the Phase 0 app shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Seichi Pilgrimage" }),
  ).toBeVisible();
  await expect(page.getByText("Phase 0 Foundation")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Foundation status" }),
  ).toBeVisible();
});
