import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesPath = fileURLToPath(new URL("../fixtures", import.meta.url));

test("scene import previews, commits, and shows imported scenes in the catalog", async ({
  page,
}) => {
  await page.goto("/imports/scenes");

  await expect(
    page.getByRole("heading", { name: "Scene Import" }),
  ).toBeVisible();
  await page
    .getByLabel("Scene CSV")
    .setInputFiles(path.join(fixturesPath, "scene-import-valid.csv"));
  await page.getByRole("button", { name: "Preview CSV" }).click();

  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "NRI-101" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm import" }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Confirm import" }).click();

  await expect(
    page.getByRole("heading", { name: "Import complete" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View scene catalog" }).click();
  await expect(page).toHaveURL(/\/scenes/);
  await expect(page.getByRole("link", { name: "NRI-101" })).toBeVisible();
});

test("scene import reports CSV errors without showing the commit action", async ({
  page,
}) => {
  await page.goto("/imports/scenes");

  await page
    .getByLabel("Scene CSV")
    .setInputFiles(path.join(fixturesPath, "scene-import-invalid.csv"));
  await page.getByRole("button", { name: "Preview CSV" }).click();

  await expect(
    page.getByRole("region", { name: "Import errors" }),
  ).toBeVisible();
  await expect(page.getByText("Invalid latitude: 91")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm import" }),
  ).toHaveCount(0);
});
