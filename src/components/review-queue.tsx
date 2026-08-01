import Link from "next/link";
import {
  getReviewBucketLabel,
  getReviewBucketOptions,
  getReviewPhotoHref,
  getReviewSceneHref,
  getSceneStatusReviewLabel,
  type ReviewQueueFilters,
  type ReviewQueueItem,
  type ReviewQueueSummary,
} from "@/application/review";
import { getSceneStatusOptions } from "@/application/scene-catalog";

export function ReviewQueue({
  items,
  totalSceneCount,
  summary,
  works,
  locations,
  trips,
  filters,
}: {
  items: readonly ReviewQueueItem[];
  totalSceneCount: number;
  summary: ReviewQueueSummary;
  works: readonly {
    id: string;
    name: string;
    shortCode: string;
  }[];
  locations: readonly {
    id: string;
    name: string;
    areaName?: string;
  }[];
  trips: readonly {
    id: string;
    name: string;
  }[];
  filters: ReviewQueueFilters;
}) {
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
              審核佇列
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              依既有 Scene 綁定檢查 Take、選出最佳照片，並完成 Review 狀態。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <ReviewStat label="顯示中" value={items.length} />
            <ReviewStat label="篩選總數" value={totalSceneCount} />
            <ReviewStat label="待確認" value={summary.pendingReview} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <ReviewFilterForm
          filters={filters}
          works={works}
          locations={locations}
          trips={trips}
        />

        <section aria-label="審核結果" className="grid min-w-0 gap-4">
          <ReviewBucketStats summary={summary} />

          {items.length === 0 ? (
            <div className="rounded border border-rail bg-white p-6">
              <h2 className="text-lg font-semibold">沒有符合的場景</h2>
              <p className="mt-2 text-sm leading-6 text-night">
                請清除篩選，或改用其他作品、地點、行程與審核分類。
              </p>
            </div>
          ) : (
            items.map((item) => (
              <ReviewQueueCard key={item.scene.id} item={item} />
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function ReviewBucketStats({ summary }: { summary: ReviewQueueSummary }) {
  return (
    <section
      aria-label="審核分類統計"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      <ReviewStat label="未拍攝" value={summary.notShot} />
      <ReviewStat label="待確認" value={summary.pendingReview} />
      <ReviewStat label="需要補拍" value={summary.retakeRequired} />
      <ReviewStat label="未選最佳" value={summary.missingBest} />
      <ReviewStat label="已審核" value={summary.reviewed} />
    </section>
  );
}

function ReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-rail bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-night">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ReviewFilterForm({
  filters,
  works,
  locations,
  trips,
}: {
  filters: ReviewQueueFilters;
  works: readonly {
    id: string;
    name: string;
    shortCode: string;
  }[];
  locations: readonly {
    id: string;
    name: string;
    areaName?: string;
  }[];
  trips: readonly {
    id: string;
    name: string;
  }[];
}) {
  return (
    <aside
      aria-label="審核篩選"
      className="min-w-0 bg-paper lg:sticky lg:top-4 lg:h-fit"
    >
      <form
        action="/reviews"
        className="grid min-w-0 gap-4 rounded border border-rail bg-white p-4"
      >
        <h2 className="text-base font-semibold">篩選條件</h2>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          審核分類
          <select
            name="bucket"
            aria-label="依審核分類篩選"
            defaultValue={filters.bucket ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">全部分類</option>
            {getReviewBucketOptions().map((bucket) => (
              <option key={bucket} value={bucket}>
                {getReviewBucketLabel(bucket)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          作品
          <select
            name="workId"
            aria-label="依作品篩選審核"
            defaultValue={filters.workId ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">全部作品</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.shortCode} - {work.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          地點
          <select
            name="locationId"
            aria-label="依地點篩選審核"
            defaultValue={filters.locationId ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">全部地點</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.areaName ? `${location.areaName} - ` : ""}
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          行程
          <select
            name="tripId"
            aria-label="依行程篩選審核"
            defaultValue={filters.tripId ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">全部行程</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          狀態
          <select
            name="status"
            aria-label="依狀態篩選審核"
            defaultValue={filters.status ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">全部狀態</option>
            {getSceneStatusOptions().map((status) => (
              <option key={status} value={status}>
                {getSceneStatusReviewLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid min-w-0 grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-1">
          <button
            type="submit"
            className="min-h-10 w-full min-w-0 rounded bg-field px-4 text-sm font-semibold text-white"
          >
            套用篩選
          </button>
          <Link
            href="/reviews"
            className="flex min-h-10 w-full min-w-0 items-center justify-center rounded border border-rail px-4 text-sm font-semibold"
          >
            清除
          </Link>
        </div>
      </form>
    </aside>
  );
}

function ReviewQueueCard({ item }: { item: ReviewQueueItem }) {
  const scene = item.scene;

  return (
    <article className="rounded border border-rail bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link
            href={getReviewSceneHref(scene.id)}
            className="text-xl font-semibold text-field underline-offset-4 hover:underline"
          >
            {scene.sceneCode}
          </Link>
          <p className="mt-2 text-sm leading-6 text-night">
            {scene.work.name}
            {scene.episode ? ` · 第 ${scene.episode} 集` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="w-fit rounded border border-rail bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-wide text-night">
            {getSceneStatusReviewLabel(scene.status)}
          </span>
          {item.photoCount > 0 && !item.hasBestPhoto ? (
            <span className="w-fit rounded border border-rail bg-[#fff7e8] px-3 py-1 text-xs font-semibold text-night">
              未選最佳照片
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
        {item.bestPhoto ? (
          <img
            src={getReviewPhotoHref(item.bestPhoto.id)}
            alt={`${scene.sceneCode} 最佳照片`}
            className="h-32 w-full rounded border border-rail bg-paper object-contain"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded border border-rail bg-paper px-3 text-center text-sm font-semibold text-night">
            {item.photoCount > 0 ? "尚未選最佳" : "無實景照片"}
          </div>
        )}

        <dl className="grid content-start gap-3 text-sm md:grid-cols-2">
          <ReviewMeta label="Take" value={`${item.photoCount} 張`} />
          <ReviewMeta
            label="最佳照片"
            value={
              item.bestPhoto ? `Take ${item.bestPhoto.takeNumber}` : "未選"
            }
          />
          <ReviewMeta
            label="地點"
            value={`${scene.location.name}${
              scene.location.areaName ? `, ${scene.location.areaName}` : ""
            }`}
          />
          <ReviewMeta
            label="行程"
            value={
              item.tripNames.length > 0 ? item.tripNames.join(", ") : "未加入"
            }
          />
        </dl>
      </div>
    </article>
  );
}

function ReviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-rail pt-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-1 break-words text-night">{value}</dd>
    </div>
  );
}
