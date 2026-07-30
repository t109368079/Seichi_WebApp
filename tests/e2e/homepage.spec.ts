import { expect, test } from "@playwright/test";

test("homepage links to scene import, map, and the catalog", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "聖地巡禮" })).toBeVisible();
  await expect(page.getByText("第三階段：地圖與導航")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "基礎工程狀態" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "匯入場景" })).toBeVisible();
  await expect(page.getByRole("link", { name: "開啟地圖" })).toBeVisible();
  await expect(page.getByRole("link", { name: "開啟場景目錄" })).toBeVisible();
});
