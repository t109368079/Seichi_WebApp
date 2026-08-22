import { expect, test } from "@playwright/test";
import { connectAllowedGoogle } from "./helpers/google-auth";

test("homepage links to scene import, map, and the catalog", async ({
  page,
}) => {
  await connectAllowedGoogle(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "聖地巡禮出發手帳" }),
  ).toBeVisible();
  await expect(page.getByText("今天要去哪一幕？")).toBeVisible();
  await expect(
    page.getByRole("figure", { name: "巡禮分鏡預覽" }),
  ).toBeVisible();
  const quickNav = page.getByRole("navigation", { name: "首頁快速入口" });
  await expect(quickNav.getByRole("link", { name: "匯入場景" })).toBeVisible();
  await expect(quickNav.getByRole("link", { name: "地圖" })).toBeVisible();
  await expect(quickNav.getByRole("link", { name: "旅行規劃" })).toBeVisible();
  await expect(quickNav.getByRole("link", { name: "場景目錄" })).toBeVisible();
  await expect(quickNav.getByRole("link", { name: "審核" })).toBeVisible();
  await expect(
    quickNav.getByRole("link", { name: "Google 整合" }),
  ).toBeVisible();
});
