import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { connectAllowedGoogle } from "./helpers/google-auth";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await connectAllowedGoogle(page);
});

test("tablet upload keeps the local photo confirmation action visible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 });

  await createTripWithFirstScene(page, "E2E Tablet Upload Layout");
  await page.getByRole("link", { name: "進入 2026-10-10 現地模式" }).click();
  await page
    .locator('ol[aria-label="2026-10-10 現地順序"] li')
    .first()
    .getByRole("link", { name: "BHC-001" })
    .click();
  await page.getByRole("link", { name: "上傳實景照片" }).click();
  await page.getByRole("tab", { name: "本地照片" }).click();

  await page
    .getByLabel("從本機相簿選取照片")
    .setInputFiles(await writeTinyPng(testInfo, "tablet-take.png"));

  const confirmButton = page.getByRole("button", {
    name: /確認上傳到 BHC-001/,
  });
  await expect(confirmButton).toBeVisible();

  const box = await confirmButton.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(768);
});

async function createTripWithFirstScene(
  page: Page,
  name: string,
): Promise<void> {
  await page.goto("/trips");
  await page.getByLabel("旅行名稱").fill(name);
  await page.getByLabel("開始日期").fill("2026-10-10");
  await page.getByLabel("結束日期").fill("2026-10-10");
  await page.getByRole("button", { name: "建立旅行" }).click();
  await expect(page).toHaveURL(/\/trips\/.+/);

  await page.getByRole("link", { name: "從目錄加入" }).first().click();
  await expect(page).toHaveURL(/\/scenes\?tripDayId=/);
  await page.getByLabel("選取 BHC-001").check();
  await page.getByRole("button", { name: "加入勾選場景" }).click();
  await expect(page).toHaveURL(/\/trips\/.+/);
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
