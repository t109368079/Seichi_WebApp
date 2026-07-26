import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabaseUrl } from "@/lib/env";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl("test"),
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("foundation metadata seed", () => {
  it("reads deterministic seed data from the test database", async () => {
    const phase = await prisma.foundationMetadata.findUnique({
      where: { key: "phase" },
    });
    const harness = await prisma.foundationMetadata.findUnique({
      where: { key: "harness" },
    });

    expect(phase?.value).toBe("0");
    expect(harness?.value).toBe("ready");
  });
});
