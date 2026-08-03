import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesPath = fileURLToPath(new URL("../fixtures", import.meta.url));

test("scene import previews, commits, and shows imported scenes in the catalog", async ({
  page,
}) => {
  await page.goto("/imports/scenes");

  await expect(page.getByRole("heading", { name: "場景匯入" })).toBeVisible();
  await page
    .getByLabel("場景 CSV")
    .setInputFiles(path.join(fixturesPath, "scene-import-valid.csv"));
  await page.getByRole("button", { name: "預覽 CSV" }).click();

  await expect(page.getByRole("region", { name: "匯入預覽" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "NRI-101" })).toBeVisible();
  await expect(page.getByRole("button", { name: "確認匯入" })).toBeEnabled();

  await page.getByRole("button", { name: "確認匯入" }).click();

  await expect(page.getByRole("heading", { name: "匯入完成" })).toBeVisible();
  await page.getByRole("link", { name: "查看場景目錄" }).click();
  await expect(page).toHaveURL(/\/scenes/);
  await expect(page.getByRole("link", { name: "NRI-101" })).toBeVisible();
});

test("scene import reports CSV errors without showing the commit action", async ({
  page,
}) => {
  await page.goto("/imports/scenes");

  await page
    .getByLabel("場景 CSV")
    .setInputFiles(path.join(fixturesPath, "scene-import-invalid.csv"));
  await page.getByRole("button", { name: "預覽 CSV" }).click();

  await expect(page.getByRole("region", { name: "匯入錯誤" })).toBeVisible();
  await expect(page.getByText("緯度無效：91")).toBeVisible();
  await expect(page.getByRole("button", { name: "確認匯入" })).toHaveCount(0);
});

test("scene import previews and commits a mocked Google Sheet", async ({
  page,
}) => {
  await page.goto("/integrations/google");
  await page.getByRole("link", { name: "建立測試連線" }).click();
  await expect(page.getByText("Google 已連接。")).toBeVisible();

  await page.goto("/imports/scenes");
  await page.getByRole("button", { name: "預覽 Google Sheet" }).click();

  await expect(page.getByRole("region", { name: "匯入預覽" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "GGL-101" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "確認 Google Sheet 匯入" }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "確認 Google Sheet 匯入" }).click();

  await expect(page.getByRole("heading", { name: "匯入完成" })).toBeVisible();
  await page.getByRole("link", { name: "查看場景目錄" }).click();
  await page.getByRole("link", { name: "GGL-101" }).click();
  await expect(
    page.getByRole("img", { name: "GGL-101 動畫原圖" }),
  ).toBeVisible();
});
