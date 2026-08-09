import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://seichi:seichi_dev_password@localhost:5432/seichi_test?schema=public";

export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  test: {
    environment: "node",
    globals: false,
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      // Integration tests write real files; keep them out of the dev photo store.
      PHOTO_STORAGE_DIR: "storage/test-scene-photos",
      PHOTO_STORAGE_BACKEND: "local",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
});
