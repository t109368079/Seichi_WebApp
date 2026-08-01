import { FoundationStatus } from "@/components/foundation-status";
import { foundationChecks, summarizeFoundationChecks } from "@/lib/foundation";
import Link from "next/link";

export default function Home() {
  const summary = summarizeFoundationChecks(foundationChecks);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-rail bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-field">
              第七階段：審核流程
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              聖地巡禮
            </h1>
            <p className="mt-4 text-base leading-7 text-night">
              匯入 CSV
              場景資料，以永久場景身份瀏覽，現地上傳實景照片，事後選出最佳 Take
              並完成審核。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/imports/scenes"
              className="flex min-h-11 w-fit items-center rounded bg-field px-5 text-sm font-semibold text-white"
            >
              匯入場景
            </Link>
            <Link
              href="/map"
              className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
            >
              開啟地圖
            </Link>
            <Link
              href="/trips"
              className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
            >
              開啟旅行規劃
            </Link>
            <Link
              href="/reviews"
              className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
            >
              開啟審核佇列
            </Link>
            <Link
              href="/scenes"
              className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
            >
              開啟場景目錄
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.5fr_1fr]">
        <FoundationStatus checks={foundationChecks} summary={summary} />

        <section className="rounded border border-rail bg-white p-5">
          <h2 className="text-lg font-semibold">目前範圍</h2>
          <p className="mt-3 text-sm leading-6 text-night">
            Phase 7 加入審核佇列、動畫與實景並排比較、最佳照片選擇與 Review
            狀態管理。Google API 整合仍留待後續階段。
          </p>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">範例作品</dt>
              <dd className="font-medium">3</dd>
            </div>
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">範例場景</dt>
              <dd className="font-medium">12</dd>
            </div>
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">行程排序</dt>
              <dd className="font-medium">手動保存</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
