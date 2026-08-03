import Link from "next/link";
import {
  getGoogleAuthStartHref,
  getGoogleIntegrationLabel,
} from "@/application/google-integration";
import {
  logoutGoogleAction,
  revokeGoogleAction,
  saveGoogleSettingsAction,
} from "@/app/integrations/google/actions";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import {
  getGoogleIntegrationSettings,
  getGoogleIntegrationStatus,
} from "@/infrastructure/repositories/google-integration-repository";

export const dynamic = "force-dynamic";

interface GoogleIntegrationPageProps {
  searchParams: Promise<{
    googleMessage?: string;
  }>;
}

export default async function GoogleIntegrationPage({
  searchParams,
}: GoogleIntegrationPageProps) {
  const sessionToken = await readGoogleSessionCookie();
  const testMode = process.env.GOOGLE_INTEGRATION_TEST_MODE === "1";
  const [status, settings, params] = await Promise.all([
    getGoogleIntegrationStatus(sessionToken),
    getGoogleIntegrationSettings(),
    searchParams,
  ]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-wide text-field"
            >
              聖地巡禮
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              Google 整合
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              管理 Google Sheet 匯入與 Drive 圖片、照片儲存的連線設定。
            </p>
          </div>
          <Link
            href="/imports/scenes"
            className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
          >
            場景匯入
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <section className="rounded border border-rail bg-white p-5">
          <div className="flex flex-col gap-4 border-b border-rail pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">連線狀態</h2>
              <p className="mt-2 text-sm leading-6 text-night">
                {getGoogleIntegrationLabel(status)}
                {status.email ? ` · ${status.email}` : ""}
              </p>
            </div>
            {status.configured ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={getGoogleAuthStartHref()}
                  className="flex min-h-11 w-fit items-center rounded bg-field px-5 text-sm font-semibold text-white"
                >
                  {status.connected ? "重新連接" : "連接 Google"}
                </Link>
                {testMode ? (
                  <Link
                    href="/auth/google/mock-connect"
                    className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
                  >
                    建立測試連線
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <GoogleMessage message={params.googleMessage} />

          {!status.configured ? (
            <div className="mt-4 rounded border border-[#f1c6bb] bg-[#fff2ef] p-4 text-sm leading-6 text-signal">
              缺少設定：{status.missingConfig.join(", ")}
            </div>
          ) : null}

          {status.connected ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <StatusRow label="名稱" value={status.name ?? "未提供"} />
              <StatusRow
                label="Token 到期"
                value={status.expiresAt ?? "未提供"}
              />
              <StatusRow
                label="授權範圍"
                value={
                  status.scopes.length > 0 ? status.scopes.join(" ") : "未提供"
                }
              />
            </dl>
          ) : null}

          {status.connected ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <form action={logoutGoogleAction}>
                <button
                  type="submit"
                  className="min-h-11 rounded border border-rail px-5 text-sm font-semibold"
                >
                  登出
                </button>
              </form>
              <form action={revokeGoogleAction}>
                <button
                  type="submit"
                  className="min-h-11 rounded border border-[#f1c6bb] px-5 text-sm font-semibold text-signal"
                >
                  撤銷授權
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <section className="rounded border border-rail bg-white p-5">
          <h2 className="text-lg font-semibold">整合設定</h2>
          <form action={saveGoogleSettingsAction} className="mt-4 grid gap-4">
            <TextInput
              label="Sheet ID"
              name="sheetId"
              defaultValue={settings.sheetId}
            />
            <TextInput
              label="Sheet Range"
              name="sheetRange"
              defaultValue={settings.sheetRange}
            />
            <TextInput
              label="Drive 照片資料夾 ID"
              name="drivePhotoFolderId"
              defaultValue={settings.drivePhotoFolderId}
            />
            <button
              type="submit"
              className="min-h-11 w-fit rounded bg-field px-5 text-sm font-semibold text-white"
            >
              儲存設定
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function GoogleMessage({ message }: { message?: string }) {
  const label = getMessageLabel(message);

  if (!label) {
    return null;
  }

  return (
    <p
      role="status"
      className="mt-4 rounded border border-rail bg-paper p-4 text-sm font-semibold text-night"
    >
      {label}
    </p>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-rail pt-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-1 break-all text-night">{value}</dd>
    </div>
  );
}

function TextInput({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        className="min-h-11 rounded border border-rail bg-paper px-3 py-2 text-sm"
      />
    </label>
  );
}

function getMessageLabel(message?: string): string | undefined {
  const labels: Record<string, string> = {
    connected: "Google 已連接。",
    denied: "Google 授權已取消。",
    failed: "Google 連接失敗。",
    invalid_state: "Google 授權狀態不一致，請重試。",
    logged_out: "已登出 Google session。",
    missing_config: "Google OAuth 設定尚未完成。",
    revoked: "Google 授權已撤銷。",
    settings_saved: "Google 整合設定已儲存。",
  };

  return message ? labels[message] : undefined;
}
