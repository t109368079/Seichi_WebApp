import { expect, test } from "@playwright/test";

test("scene map loads demo marker groups and shows grouped scene identities", async ({
  page,
}) => {
  await page.goto("/map");

  await expect(page.getByRole("heading", { name: "Scene Map" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Projected scene map" }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Select marker group: 3 scenes at Ikebukuro Station East Gate",
    })
    .click();

  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ARS-001" })).toBeVisible();
  await expect(
    page.getByText("BHC - Blue Hour Crossing · Episode 01"),
  ).toBeVisible();
  await expect(
    page.getByText("SLC - Station Lights Chronicle · Episode 03"),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Open navigation" }).first(),
  ).toHaveAttribute(
    "href",
    "https://www.google.com/maps/dir/?api=1&destination=35.73028,139.71145",
  );
});

test("scene map filters through URL query parameters", async ({ page }) => {
  await page.goto("/map");

  await page
    .getByLabel("Filter map by status")
    .selectOption({ label: "Retake required" });
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/status=RETAKE_REQUIRED/);
  await expect(page.getByRole("link", { name: "BHC-002" })).toBeVisible();
  await page
    .getByRole("button", {
      name: "Select marker group: 1 scenes at Otsuka Station North Exit",
    })
    .click();
  await expect(page.getByRole("link", { name: "ARS-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toHaveCount(0);
});
