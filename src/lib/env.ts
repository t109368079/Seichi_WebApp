export type DatabaseTarget = "dev" | "test";

const defaultDatabaseUrls: Record<DatabaseTarget, string> = {
  dev: "postgresql://seichi:seichi_dev_password@localhost:5432/seichi_dev?schema=public",
  test: "postgresql://seichi:seichi_dev_password@localhost:5432/seichi_test?schema=public",
};

export function getDatabaseUrl(target: DatabaseTarget): string {
  if (target === "test") {
    return process.env.TEST_DATABASE_URL ?? defaultDatabaseUrls.test;
  }

  return process.env.DATABASE_URL ?? defaultDatabaseUrls.dev;
}

export function parseDatabaseTarget(args: readonly string[]): DatabaseTarget {
  if (args.includes("--test")) {
    return "test";
  }

  return "dev";
}
