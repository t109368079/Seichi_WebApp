import Link from "next/link";
import { SceneImportForm } from "@/components/scene-import-form";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import {
  getGoogleIntegrationSettings,
  getGoogleIntegrationStatus,
} from "@/infrastructure/repositories/google-integration-repository";

export const dynamic = "force-dynamic";

export default async function SceneImportPage() {
  const sessionToken = await readGoogleSessionCookie();
  const [settings, googleStatus] = await Promise.all([
    getGoogleIntegrationSettings(),
    getGoogleIntegrationStatus(sessionToken),
  ]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-field">
              聖地巡禮
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              場景匯入
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              把整理好的作品、集數、地點與 Drive 圖片先預覽，再收進場景手帳。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/integrations/google"
              className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
            >
              Google 設定
            </Link>
            <Link
              href="/scenes"
              className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
            >
              場景目錄
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-6">
        <SceneImportForm
          initialSheetId={settings.sheetId}
          initialSheetRange={settings.sheetRange}
          googleConnected={googleStatus.connected}
        />
      </div>
    </main>
  );
}
