import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@/lib/env";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? getDatabaseUrl("dev"),
    },
  },
});

const records = [
  ["project", "seichi-pilgrimage-app"],
  ["phase", "0"],
  ["harness", "ready"],
] as const;

for (const [key, value] of records) {
  await prisma.foundationMetadata.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

await prisma.$disconnect();

console.log(`Seeded ${records.length} foundation metadata records.`);
