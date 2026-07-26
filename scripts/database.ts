import { spawnSync } from "node:child_process";
import { Client } from "pg";

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function getAdminConnection(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");
  url.pathname = "/postgres";

  return {
    adminUrl: url.toString(),
    databaseName,
  };
}

export async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const { adminUrl, databaseName } = getAdminConnection(databaseUrl);

  if (!/^[A-Za-z0-9_-]+$/.test(databaseName)) {
    throw new Error(`Unsafe database name: ${databaseName}`);
  }

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

export function runCommand(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(command, [...args], {
    env,
    shell: true,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}
