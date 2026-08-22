import { expect, test, type Page } from "@playwright/test";
import { connectAllowedGoogle } from "./helpers/google-auth";

test.beforeEach(async ({ page }) => {
  await connectAllowedGoogle(page);
});

/**
 * This suite mutates Scene.status in the shared test database, and Playwright
 * orders spec files by path, so it runs before scene-catalog.spec.ts and
 * scene-map.spec.ts. Both assert exact RETAKE_REQUIRED result sets, so every
 * scene touched here must end at its seeded status:
 *   BHC-001 -> NOT_SHOT
 *   SLC-001 -> PENDING_REVIEW
 * Restoration uses the Block 5.3 actions, so it is coverage rather than cleanup.
 *
 * Each test creates its own trip and navigates by captured URL rather than by
 * trip name, so a re-run against a non-reset database cannot produce ambiguous
 * locators.
 */
const tabletViewports = [
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1366, height: 1024 },
];

const dayOrder = 'ol[aria-label="2026-10-10 現地順序"] li';

test("field mode walks a day in manual order and records reversible status", async ({
  page,
}) => {
  await createFieldTrip(page, "E2E 現地模式旅行");

  await page.getByRole("link", { name: "進入 2026-10-10 現地模式" }).click();

  await expect(page).toHaveURL(/\/field\/.+/);
  await expect(page.getByRole("heading", { name: "現地模式" })).toBeVisible();
  await expect(page.getByText("E2E 現地模式旅行 · 2026-10-10")).toBeVisible();

  const order = page.locator(dayOrder);
  await expect(
    order.nth(0).getByRole("link", { name: "BHC-001" }),
  ).toBeVisible();
  await expect(
    order.nth(1).getByRole("link", { name: "SLC-001" }),
  ).toBeVisible();

  await order.nth(0).getByRole("link", { name: "BHC-001" }).click();

  await expect(page).toHaveURL(/\/field\/.+\/.+/);
  await expect(
    page.getByRole("figure", { name: "BHC-001 動畫參考圖" }),
  ).toBeVisible();
  await expect(page.getByText("demo-drive-bhc-001")).toBeVisible();
  await expect(
    page.getByText("BHC - Blue Hour Crossing · 第 01 集"),
  ).toBeVisible();
  await expect(page.getByText("第 1 / 2 個場景")).toBeVisible();
  await expect(
    page.getByText("Morning establishing cut facing the station sign."),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "開啟導航" })).toHaveAttribute(
    "href",
    "https://maps.google.com/?q=35.73028,139.71145",
  );

  await page.getByRole("link", { name: "下一個場景" }).click();
  await expect(
    page.getByRole("figure", { name: "SLC-001 動畫參考圖" }),
  ).toBeVisible();
  await expect(page.getByText("第 2 / 2 個場景")).toBeVisible();

  await page.getByRole("link", { name: "上一個場景" }).click();
  await expect(
    page.getByRole("figure", { name: "BHC-001 動畫參考圖" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "標記待確認" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("待確認");
  await expect(
    page.getByRole("group", { name: "BHC-001 現地狀態操作" }),
  ).toBeVisible();
  // The anime reference must survive a status change.
  await expect(
    page.getByRole("figure", { name: "BHC-001 動畫參考圖" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "標記需要補拍" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("需要補拍");
  await expect(
    page.getByRole("figure", { name: "BHC-001 動畫參考圖" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "返回未拍攝" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("未拍攝");

  await page.reload();
  await expect(page.getByLabel("目前狀態")).toHaveText("未拍攝");

  await page.getByRole("link", { name: "返回今日行程" }).first().click();
  await expect(page.getByText("待處理")).toBeVisible();
});

test("today shortcut opens field mode and reversible actions restore seeded status", async ({
  page,
}) => {
  const tripId = await createFieldTrip(page, "E2E 現地狀態還原");

  // Today is outside the trip range, so the shortcut falls back to the first day.
  // The generous timeout covers first-hit dev-server compilation of this route.
  await page.goto(`/trips/${tripId}/field`);
  await page.waitForURL(/\/field\/.+/, { timeout: 30000 });
  await expect(page.getByText("E2E 現地狀態還原 · 2026-10-10")).toBeVisible();

  await page
    .locator(dayOrder)
    .nth(1)
    .getByRole("link", { name: "SLC-001" })
    .click();
  await expect(page.getByLabel("目前狀態")).toHaveText("待確認");

  await page.getByRole("button", { name: "跳過此場景" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("已略過");
  await expect(page.getByRole("button", { name: "標記需要補拍" })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "返回未拍攝" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("未拍攝");

  // SLC-001 is seeded as PENDING_REVIEW, not NOT_SHOT.
  await page.getByRole("button", { name: "標記待確認" }).click();
  await expect(page.getByLabel("目前狀態")).toHaveText("待確認");

  await page.goto("/scenes?status=NOT_SHOT");
  await expect(page.getByRole("link", { name: "BHC-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SLC-001" })).toHaveCount(0);

  await page.goto("/scenes?status=RETAKE_REQUIRED");
  await expect(page.getByRole("link", { name: "BHC-002" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ARS-003" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BHC-001" })).toHaveCount(0);
});

test("field mode keeps REVIEWED scenes read only", async ({ page }) => {
  await createFieldTrip(page, "E2E 現地已審核", ["ARS-001"]);

  await page.getByRole("link", { name: "進入 2026-10-10 現地模式" }).click();
  await page
    .locator(dayOrder)
    .first()
    .getByRole("link", { name: "ARS-001" })
    .click();

  await expect(
    page.getByRole("figure", { name: "ARS-001 動畫參考圖" }),
  ).toBeVisible();
  await expect(page.getByLabel("目前狀態")).toHaveText("已審核");
  await expect(page.getByText("現地模式不提供變更")).toBeVisible();
  await expect(page.getByRole("button", { name: "標記待確認" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "跳過此場景" })).toHaveCount(0);
});

for (const viewport of tabletViewports) {
  test.describe(`tablet ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("field mode scene page fits the tablet viewport", async ({ page }) => {
      // Two scenes so the next-scene control renders as an enabled link.
      await createFieldTrip(page, `E2E 平板 ${viewport.width}`);
      await page
        .getByRole("link", { name: "進入 2026-10-10 現地模式" })
        .click();
      await page
        .locator(dayOrder)
        .first()
        .getByRole("link", { name: "BHC-001" })
        .click();

      const reference = page.getByRole("figure", {
        name: "BHC-001 動畫參考圖",
      });
      await expect(reference).toBeVisible();

      const referenceBox = await reference.boundingBox();
      expect(referenceBox?.height ?? 0).toBeGreaterThanOrEqual(280);

      for (const name of ["開啟導航", "下一個場景", "返回今日行程"]) {
        const box = await page
          .getByRole("link", { name })
          .first()
          .boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }

      const statusBox = await page
        .getByRole("button", { name: "標記待確認" })
        .first()
        .boundingBox();
      expect(statusBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}

/**
 * Creates a trip through the UI and leaves the browser on its Trip Detail page.
 * Returns the trip id so tests can address routes directly instead of looking
 * trips up by name in the shared list.
 */
async function createFieldTrip(
  page: Page,
  name: string,
  sceneCodes: readonly string[] = ["BHC-001", "SLC-001"],
): Promise<string> {
  await page.goto("/trips");
  await page.getByLabel("旅行名稱").fill(name);
  await page.getByLabel("開始日期").fill("2026-10-10");
  await page.getByLabel("結束日期").fill("2026-10-11");
  await page.getByRole("button", { name: "建立旅行" }).click();

  await expect(page).toHaveURL(/\/trips\/.+/);
  const tripId = page.url().split("/trips/")[1]?.split(/[?#]/)[0] ?? "";
  expect(tripId).not.toBe("");

  await page.getByRole("link", { name: "從目錄加入" }).first().click();
  await expect(page).toHaveURL(/\/scenes\?tripDayId=/);

  for (const sceneCode of sceneCodes) {
    await page.getByLabel(`選取 ${sceneCode}`).check();
  }

  await page.getByRole("button", { name: "加入勾選場景" }).click();
  await expect(page).toHaveURL(/\/trips\/.+/);

  return tripId;
}
