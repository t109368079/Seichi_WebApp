import { getDatabaseUrl, parseDatabaseTarget } from "@/lib/env";
import { ensureDatabaseExists, runCommand } from "./database";

const target = parseDatabaseTarget(process.argv);
const databaseUrl = getDatabaseUrl(target);
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};

await ensureDatabaseExists(databaseUrl);
runCommand("prisma", ["migrate", "reset", "--force", "--skip-seed"], env);
runCommand("tsx", ["prisma/seed.ts"], env);
