import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const e2ePort = process.env.E2E_PORT ?? "3100";
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://seichi:seichi_dev_password@localhost:5432/seichi_test?schema=public";

const serverEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  PHOTO_STORAGE_DIR:
    process.env.PHOTO_STORAGE_DIR ?? "storage/e2e-scene-photos",
  PHOTO_STORAGE_BACKEND: "google-drive",
  VERCEL: "1",
  GOOGLE_INTEGRATION_TEST_MODE: "1",
  GOOGLE_CLIENT_ID: "mock-google-client-id",
  GOOGLE_CLIENT_SECRET: "mock-google-client-secret",
  GOOGLE_REDIRECT_URI: `${e2eBaseUrl}/auth/google/callback`,
  GOOGLE_TOKEN_ENCRYPTION_KEY: "playwright-google-token-encryption-key",
  APP_ACCESS_CONTROL_MODE: "required",
  APP_ALLOWED_GOOGLE_EMAILS: "mock@example.test",
};

let server: ChildProcess | undefined;
let exitCode = 1;

try {
  server = startNextDevServer();
  await waitForServer();
  exitCode = await runPlaywright(process.argv.slice(2));
} finally {
  stopProcessTree(server);
}

process.exit(exitCode);

function startNextDevServer(): ChildProcess {
  const nextCli = path.join(
    root,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  const child = spawn(process.execPath, [nextCli, "dev", "--port", e2ePort], {
    cwd: root,
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[WebServer] ${chunk.toString()}`);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[WebServer] ${chunk.toString()}`);
  });

  return child;
}

async function waitForServer(): Promise<void> {
  const timeoutMs = 120_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (server && server.exitCode !== null) {
      throw new Error(`Next dev server exited with code ${server.exitCode}.`);
    }

    try {
      await fetch(e2eBaseUrl, {
        method: "HEAD",
        redirect: "manual",
      });
      return;
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`Next dev server did not start within ${timeoutMs}ms.`);
}

function runPlaywright(args: string[]): Promise<number> {
  const playwrightCli = path.join(root, "node_modules", "playwright", "cli.js");
  const child = spawn(
    process.execPath,
    [playwrightCli, "test", "-c", "config/playwright.config.ts", ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        E2E_PORT: e2ePort,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    let output = "";
    let summaryExitCode: number | undefined;
    let summaryTimer: NodeJS.Timeout | undefined;

    const resolveOnce = (code: number) => {
      if (settled) {
        return;
      }

      settled = true;
      if (summaryTimer) {
        clearTimeout(summaryTimer);
      }
      resolve(code);
    };

    const handleOutput = (stream: NodeJS.WriteStream, chunk: Buffer): void => {
      const text = chunk.toString();
      stream.write(text);
      output = `${output}${text}`.slice(-8000);
      summaryExitCode = inferPlaywrightExitCode(output);

      if (summaryExitCode !== undefined && !summaryTimer) {
        summaryTimer = setTimeout(() => {
          stopProcessTree(child);
          resolveOnce(summaryExitCode ?? 1);
        }, 3000);
      }
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      handleOutput(process.stdout, chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      handleOutput(process.stderr, chunk);
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        resolveOnce(summaryExitCode ?? 1);
        return;
      }

      resolveOnce(code ?? summaryExitCode ?? 1);
    });
  });
}

function inferPlaywrightExitCode(output: string): number | undefined {
  const failedMatch = output.match(/\b\d+\s+failed\b/);

  if (failedMatch) {
    return 1;
  }

  const passedMatch = output.match(/\b\d+\s+passed\b/);

  if (passedMatch) {
    return 0;
  }

  return undefined;
}

function stopProcessTree(child: ChildProcess | undefined): void {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }

  child.stdout?.destroy();
  child.stderr?.destroy();

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
      timeout: 5000,
    });
    child.kill();
    return;
  }

  child.kill("SIGTERM");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
