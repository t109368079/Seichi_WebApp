import { expect, test } from "@playwright/test";

test("scene catalog loads demo scenes and opens a scene detail page", async ({
  page,
}) => {
  await page.goto("/scenes");

  await expect(
    page.getByRole("heading", { name: "Scene Catalog" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-001" })).toBeVisible();
  await expect(
    page.getByText("Ikebukuro Station East Gate,").first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "BHC-001" }).click();

  await expect(page).toHaveURL(/\/scenes\/scene-bhc-001/);
  await expect(page.getByRole("heading", { name: "BHC-001" })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("demo-drive-bhc-001")).toBeVisible();
  await expect(page.getByText("Scene ID", { exact: true })).toBeVisible();
});

test("scene catalog filters by work, location, and status through the URL", async ({
  page,
}) => {
  await page.goto("/scenes");

  await page
    .getByLabel("Filter by work")
    .selectOption({ label: "BHC - Blue Hour Crossing" });
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/workId=work-blue-hour-crossing/);
  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-004" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-001" })).toHaveCount(0);

  await page.goto("/scenes");
  await page
    .getByLabel("Filter by location")
    .selectOption({ label: "Otsuka - Otsuka Station North Exit" });
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/locationId=location-otsuka-north-exit/);
  await expect(page.getByRole("link", { name: "BHC-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ARS-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("link", { name: "BHC-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toHaveCount(0);

  await page.goto("/scenes?status=RETAKE_REQUIRED");
  await expect(page.getByRole("link", { name: "BHC-002" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ARS-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toHaveCount(0);
});
