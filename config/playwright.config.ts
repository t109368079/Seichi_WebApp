import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://seichi:seichi_dev_password@localhost:5432/seichi_test?schema=public";

export default defineConfig({
  testDir: "../tests/e2e",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
    url: "http://127.0.0.1:3000",
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
