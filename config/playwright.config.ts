import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://seichi:seichi_dev_password@localhost:5432/seichi_test?schema=public";
const e2ePort = process.env.E2E_PORT ?? "3100";
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "../tests/e2e",
  fullyParallel: true,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${e2ePort}`,
    env: {
      DATABASE_URL: testDatabaseUrl,
      PHOTO_STORAGE_DIR:
        process.env.PHOTO_STORAGE_DIR ?? "storage/e2e-scene-photos",
    },
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
