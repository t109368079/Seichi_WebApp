import { expect, test } from "@playwright/test";

test("trip planning creates a trip, adds scenes, reorders, and removes", async ({
  page,
}) => {
  await page.goto("/trips");

  await expect(page.getByRole("heading", { name: "旅行規劃" })).toBeVisible();
  await page.getByLabel("旅行名稱").fill("E2E 東京旅行");
  await page.getByLabel("開始日期").fill("2026-10-10");
  await page.getByLabel("結束日期").fill("2026-10-11");
  await page.getByRole("button", { name: "建立旅行" }).click();

  await expect(page).toHaveURL(/\/trips\/.+/);
  await expect(
    page.getByRole("heading", { name: "E2E 東京旅行" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "2026-10-10" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2026-10-11" })).toBeVisible();

  await page.getByRole("link", { name: "從目錄加入" }).first().click();
  await expect(page).toHaveURL(/\/scenes\?tripDayId=/);
  await page
    .getByLabel("依作品篩選")
    .selectOption({ label: "BHC - Blue Hour Crossing" });
  await page.getByRole("button", { name: "套用篩選" }).click();
  await expect(page).toHaveURL(/workId=work-blue-hour-crossing/);
  await expect(page.getByLabel("選取 SLC-001")).toHaveCount(0);

  await page.getByRole("button", { name: "全選目前篩選結果" }).click();
  await expect(page.getByLabel("選取 BHC-001")).toBeChecked();
  await expect(page.getByLabel("選取 BHC-004")).toBeChecked();

  await page.getByRole("button", { name: "全部不選" }).click();
  await expect(page.getByLabel("選取 BHC-001")).not.toBeChecked();
  await expect(page.getByLabel("選取 BHC-004")).not.toBeChecked();

  await page.getByRole("button", { name: "全選目前篩選結果" }).click();
  await page.getByLabel("選取 BHC-002").uncheck();
  await page.getByLabel("選取 BHC-003").uncheck();
  await page.getByRole("button", { name: "加入勾選場景" }).click();

  await expect(page).toHaveURL(/\/trips\/.+/);
  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-004" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-001" })).toHaveCount(0);

  await page.getByRole("link", { name: "從地圖加入" }).first().click();
  await expect(page).toHaveURL(/\/map\?tripDayId=/);
  await page.getByRole("button", { name: "將 ARS-001 加入此日" }).click();

  await expect(page).toHaveURL(/\/trips\/.+/);
  await expect(page.getByRole("link", { name: "ARS-001" })).toBeVisible();

  const firstDayOrder = page.locator('ol[aria-label="2026-10-10 場景順序"] li');
  await page.getByRole("button", { name: "上移 BHC-004" }).click();
  await expect(
    firstDayOrder.nth(0).getByRole("link", { name: "BHC-004" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    firstDayOrder.nth(0).getByRole("link", { name: "BHC-004" }),
  ).toBeVisible();
  await expect(
    firstDayOrder.nth(1).getByRole("link", { name: "BHC-001" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "移除 BHC-001" }).click();
  await expect(page.getByRole("link", { name: "BHC-001" })).toHaveCount(0);
  await expect(page.getByText("2 個場景")).toBeVisible();
});
