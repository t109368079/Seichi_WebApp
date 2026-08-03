import { expect, test } from "@playwright/test";

test("scene map loads demo marker groups and shows grouped scene identities", async ({
  page,
}) => {
  await page.goto("/map");

  await expect(page.getByRole("heading", { name: "場景地圖" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "投影場景地圖" }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "選取標記群組：3 個場景，地點 Ikebukuro Station East Gate",
    })
    .click();

  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ARS-001" })).toBeVisible();
  await expect(
    page.getByText("BHC - Blue Hour Crossing · 第 01 集"),
  ).toBeVisible();
  await expect(
    page.getByText("SLC - Station Lights Chronicle · 第 03 集"),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "開啟導航" }).first(),
  ).toHaveAttribute("href", "https://maps.google.com/?q=35.73028,139.71145");
});

test("scene map filters through URL query parameters", async ({ page }) => {
  await page.goto("/map");

  await page.getByLabel("依狀態篩選地圖").selectOption({ label: "需要補拍" });
  await page.getByRole("button", { name: "套用篩選" }).click();

  await expect(page).toHaveURL(/status=RETAKE_REQUIRED/);
  await expect(page.getByRole("link", { name: "BHC-002" })).toBeVisible();
  await page
    .getByRole("button", {
      name: "選取標記群組：1 個場景，地點 Otsuka Station North Exit",
    })
    .click();
  await expect(page.getByRole("link", { name: "ARS-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toHaveCount(0);
});
