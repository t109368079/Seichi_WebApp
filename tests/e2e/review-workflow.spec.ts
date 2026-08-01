import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("review queue compares uploaded takes, selects best, and updates trip progress", async ({
  page,
}, testInfo) => {
  const tripId = await createReviewTrip(page, "E2E Review Workflow");
  const tripUrl = `/trips/${tripId}`;

  await page.getByRole("link", { name: "進入 2026-10-10 現地模式" }).click();
  await page
    .locator('ol[aria-label="2026-10-10 現地順序"] li')
    .first()
    .getByRole("link", { name: "BHC-001" })
    .click();

  await uploadTake(page, testInfo, "take-1.png");
  const fieldSceneUrl = page.url();
  await expect(page.getByText("Take 1")).toBeVisible();
  await expect(page.getByLabel("目前狀態")).toHaveText("待確認");

  await uploadTake(page, testInfo, "take-2.png");
  await expect(page.getByText("Take 2")).toBeVisible();

  await page.goto("/reviews?bucket=PENDING_REVIEW");
  await expect(page.getByRole("heading", { name: "審核佇列" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();

  await page.getByRole("link", { name: "BHC-001" }).click();
  await expect(page).toHaveURL(/\/reviews\/scene-bhc-001/);
  await expect(
    page.getByRole("region", { name: "動畫與實景比較" }),
  ).toBeVisible();
  await expect(
    page.getByRole("figure", { name: "BHC-001 動畫參考圖" }),
  ).toBeVisible();
  await expect(page.getByText("請先選擇最佳照片")).toBeVisible();
  await expect(page.getByRole("button", { name: "標記已審核" })).toBeDisabled();

  await page.getByRole("link", { name: "查看 Take 2" }).click();
  await expect(page.getByRole("heading", { name: "Take 2" })).toBeVisible();
  await page.getByRole("button", { name: "設為最佳照片 Take 2" }).click();
  await expect(page.getByText("目前最佳：Take 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "標記已審核" })).toBeEnabled();

  await page.getByRole("button", { name: "標記已審核" }).click();
  await expect(page.getByText("此場景已完成審核。")).toBeVisible();
  await expect(page.getByText("已審核").first()).toBeVisible();

  await page.goto(tripUrl);
  await expect(page.getByText("1 個場景 · 已審核 1")).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();

  await page.goto(fieldSceneUrl);
  await page.getByRole("button", { name: "刪除 Take 2" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("待確認");
  await page.getByRole("button", { name: "刪除 Take 1" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("未拍攝");
});

async function uploadTake(
  page: Page,
  testInfo: TestInfo,
  fileName: string,
): Promise<void> {
  const filePath = await writeTinyPng(testInfo, fileName);

  await page.getByRole("link", { name: "上傳實景照片" }).click();
  await page.getByLabel("從本機相簿選取照片").setInputFiles(filePath);
  await expect(page.getByAltText("待上傳照片預覽")).toBeVisible();
  await page.getByRole("button", { name: /確認上傳到 BHC-001/ }).click();
  await expect(page).toHaveURL(/\/field\/[^/]+\/[^/?#]+(?:[?#].*)?$/);
}

async function writeTinyPng(
  testInfo: TestInfo,
  fileName: string,
): Promise<string> {
  const filePath = testInfo.outputPath(fileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, tinyPng);

  return filePath;
}

async function createReviewTrip(page: Page, name: string): Promise<string> {
  await page.goto("/trips");
  await page.getByLabel("旅行名稱").fill(name);
  await page.getByLabel("開始日期").fill("2026-10-10");
  await page.getByLabel("結束日期").fill("2026-10-10");
  await page.getByRole("button", { name: "建立旅行" }).click();

  await expect(page).toHaveURL(/\/trips\/.+/);
  const tripId = page.url().split("/trips/")[1]?.split(/[?#]/)[0] ?? "";
  expect(tripId).not.toBe("");

  await page.getByRole("link", { name: "從目錄加入" }).first().click();
  await expect(page).toHaveURL(/\/scenes\?tripDayId=/);
  await page.getByRole("button", { name: "將 BHC-001 加入此日" }).click();
  await expect(page).toHaveURL(/\/trips\/.+/);

  return tripId;
}
