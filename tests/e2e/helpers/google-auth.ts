import { expect, type Page } from "@playwright/test";

export async function connectAllowedGoogle(page: Page): Promise<void> {
  await page.goto("/auth/google/mock-connect");
  await expect(page.getByText("Google 已連接。")).toBeVisible();
}
