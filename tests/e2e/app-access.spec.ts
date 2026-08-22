import { expect, test, type Page } from "@playwright/test";
import { connectAllowedGoogle } from "./helpers/google-auth";

test("unauthenticated browsers cannot view protected app pages", async ({
  page,
}) => {
  const apiResponse = await page.request.post(
    "/api/google-photos-picker/sessions",
  );

  expect(apiResponse.status()).toBe(401);

  await page.goto("/scenes");

  await expect(page).toHaveURL(/\/integrations\/google/);
  await expect(
    page.getByText("請先使用允許的 Google 帳號登入。"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "場景目錄" })).toHaveCount(0);
});

test("mocked allowed Google login reaches protected pages", async ({
  page,
}) => {
  await connectAllowedGoogle(page);
  await page.goto("/scenes");

  await expect(page.getByRole("heading", { name: "場景目錄" })).toBeVisible();
});

test("mocked disallowed Google account cannot enter the app", async ({
  page,
}) => {
  await page.goto("/auth/google/mock-connect?email=blocked@example.test");

  await expect(
    page.getByText("這個 Google 帳號不在允許清單中。"),
  ).toBeVisible();

  await page.goto("/scenes");
  await expect(page).toHaveURL(/\/integrations\/google/);
  await expect(
    page.getByText("請先使用允許的 Google 帳號登入。"),
  ).toBeVisible();
});

test("field upload page keeps Google Photos Picker as the production source", async ({
  page,
}) => {
  await connectAllowedGoogle(page);
  await createTripWithFirstScene(page, "E2E Photos Picker Source");
  await page.getByRole("link", { name: "進入 2026-10-10 現地模式" }).click();
  await page
    .locator('ol[aria-label="2026-10-10 現地順序"] li')
    .first()
    .getByRole("link", { name: "BHC-001" })
    .click();
  await page.getByRole("link", { name: "上傳實景照片" }).click();

  await expect(page.getByRole("tab", { name: "Google 相簿" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "開啟 Google 相簿" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "本地照片" }).click();
  await expect(page.getByText("本地照片上傳僅適合小檔備援。")).toBeVisible();
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
