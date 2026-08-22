import { expect, test } from "@playwright/test";
import { connectAllowedGoogle } from "./helpers/google-auth";

test.beforeEach(async ({ page }) => {
  await connectAllowedGoogle(page);
});

test("scene catalog loads demo scenes and opens a scene detail page", async ({
  page,
}) => {
  await page.goto("/scenes");

  await expect(page.getByRole("heading", { name: "場景目錄" })).toBeVisible();
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
  await expect(
    page.getByRole("definition").filter({ hasText: "demo-drive-bhc-001" }),
  ).toBeVisible();
  await expect(page.getByText("場景 ID", { exact: true })).toBeVisible();
});

test("scene catalog filters by work, location, and status through the URL", async ({
  page,
}) => {
  await page.goto("/scenes");

  await page
    .getByLabel("依作品篩選")
    .selectOption({ label: "BHC - Blue Hour Crossing" });
  await page.getByRole("button", { name: "套用篩選" }).click();
  await expect(page).toHaveURL(/workId=work-blue-hour-crossing/);
  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-004" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-001" })).toHaveCount(0);

  await page.goto("/scenes");
  await page
    .getByLabel("依地點篩選")
    .selectOption({ label: "Otsuka - Otsuka Station North Exit" });
  await page.getByRole("button", { name: "套用篩選" }).click();
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

test("scene catalog creates and deletes a manually entered scene", async ({
  page,
}) => {
  await page.goto("/scenes");
  await page.getByRole("link", { name: "新增場景" }).click();

  await expect(page.getByRole("heading", { name: "新增場景" })).toBeVisible();
  await page.getByLabel(/場景代碼/).fill("manual-e2e-001");
  await page.getByLabel(/作品名稱/).fill("Manual E2E Work");
  await page.getByLabel(/作品短代碼/).fill("mew");
  await page.getByLabel("集數").fill("12");
  await page.getByLabel(/動畫 Drive 檔案 ID/).fill("manual-e2e-drive-001");
  await page.getByLabel(/地點名稱/).fill("Manual E2E Station");
  await page.getByLabel(/區域/).fill("Manual E2E Area");
  await page
    .getByLabel("地圖 URL")
    .fill("https://maps.google.com/?q=35.1,139.2");
  await page.getByLabel("備註").fill("Created by the scene catalog E2E test.");
  await page.getByRole("button", { name: "新增場景" }).click();

  await expect(page).toHaveURL(/\/scenes\/.+sceneMessage=/);
  await expect(
    page.getByRole("heading", { name: "MANUAL-E2E-001" }),
  ).toBeVisible();
  await expect(page.getByText("場景已新增。")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Manual E2E Work" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "返回場景目錄" }).click();
  await expect(
    page.getByRole("link", { name: "MANUAL-E2E-001" }),
  ).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "刪除 MANUAL-E2E-001" }).click();

  await expect(page.getByText("場景 MANUAL-E2E-001 已刪除。")).toBeVisible();
  await expect(page.getByRole("link", { name: "MANUAL-E2E-001" })).toHaveCount(
    0,
  );
});

test("scene detail edits location, coordinates, and map URL", async ({
  page,
}) => {
  await page.goto("/scenes/scene-bhc-004");
  await expect(page.getByRole("heading", { name: "BHC-004" })).toBeVisible({
    timeout: 15000,
  });

  await page.getByLabel("地點名稱").fill("Otsuka Station North Exit");
  await page.getByLabel("區域").fill("Otsuka");
  await page.getByLabel("緯度").fill("35.73263");
  await page.getByLabel("經度").fill("139.72862");
  await page
    .getByLabel("地圖 URL")
    .fill("https://maps.google.com/?q=35.73263,139.72862");
  await page.getByLabel("備註").fill("Updated E2E framing note.");
  await page.getByRole("button", { name: "儲存變更" }).click();

  await expect(page.getByText("場景資料已更新。")).toBeVisible();
  await expect(
    page
      .getByRole("definition")
      .filter({ hasText: "Otsuka Station North Exit, Otsuka" }),
  ).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "35.73263, 139.72862" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "開啟導航" })).toHaveAttribute(
    "href",
    "https://maps.google.com/?q=35.73263,139.72862",
  );
  await expect(
    page
      .getByRole("definition")
      .filter({ hasText: "Updated E2E framing note." }),
  ).toBeVisible();

  await page.getByLabel("地點名稱").fill("Toden Otsuka Platform");
  await page.getByLabel("區域").fill("Otsuka");
  await page.getByLabel("緯度").fill("35.73192");
  await page.getByLabel("經度").fill("139.72831");
  await page.getByLabel("地圖 URL").fill("");
  await page
    .getByLabel("備註")
    .fill("Tram platform cut with static demo Drive reference.");
  await page.getByRole("button", { name: "儲存變更" }).click();

  await expect(page.getByText("場景資料已更新。")).toBeVisible();
  await expect(
    page
      .getByRole("definition")
      .filter({ hasText: "Toden Otsuka Platform, Otsuka" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "開啟導航" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/dir/?api=1&destination=35.73192,139.72831",
  );
  await expect(
    page.getByRole("definition").filter({
      hasText: "Tram platform cut with static demo Drive reference.",
    }),
  ).toBeVisible();
});
