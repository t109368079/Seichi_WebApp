import Link from "next/link";
import { deleteSceneAction } from "@/app/scenes/actions";
import { AddToTripDayForm } from "@/components/add-to-trip-day-form";
import { SceneDeleteSubmitButton } from "@/components/scene-delete-submit-button";
import { TripDayContextBanner } from "@/components/trip-day-context-banner";
import {
  formatSceneCoordinates,
  getSceneStatusLabel,
  getSceneStatusOptions,
  type SceneCatalogFilters,
  type SceneCatalogItem,
} from "@/application/scene-catalog";
import {
  isSceneAddedToTripDay,
  type TripDaySelectionContext,
} from "@/application/trip-planning";

interface SceneCatalogProps {
  scenes: readonly SceneCatalogItem[];
  totalSceneCount: number;
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
  filters: SceneCatalogFilters;
  tripDayContext?: TripDaySelectionContext;
  returnTo: string;
  sceneMessage?: string;
}

const statusTone = {
  NOT_SHOT: "border-rail bg-paper text-ink",
  PENDING_REVIEW: "border-[#c3d8ee] bg-[#eef6ff] text-night",
  REVIEWED: "border-[#c8ded2] bg-[#edf8f1] text-field",
  RETAKE_REQUIRED: "border-[#f1c6bb] bg-[#fff2ef] text-signal",
  SKIPPED: "border-[#d2d6dd] bg-[#f3f4f6] text-night",
} satisfies Record<SceneCatalogItem["status"], string>;

export function SceneCatalog({
  scenes,
  totalSceneCount,
  works,
  locations,
  filters,
  tripDayContext,
  returnTo,
  sceneMessage,
}: SceneCatalogProps) {
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
              場景目錄
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              依作品與地點瀏覽永久場景身份。
            </p>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <CatalogStat label="顯示中" value={scenes.length.toString()} />
              <CatalogStat label="總數" value={totalSceneCount.toString()} />
              <CatalogStat label="作品" value={works.length.toString()} />
            </div>
            <Link
              href="/scenes/new"
              className="flex min-h-10 w-fit items-center rounded bg-field px-4 text-sm font-semibold text-white"
            >
              新增場景
            </Link>
            <Link
              href="/imports/scenes"
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              匯入場景
            </Link>
            <Link
              href={buildMapHref(filters, tripDayContext?.tripDayId)}
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              地圖檢視
            </Link>
            <Link
              href="/trips"
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              旅行規劃
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <SceneFilterForm
          filters={filters}
          works={works}
          locations={locations}
          tripDayId={tripDayContext?.tripDayId}
        />

        <section aria-label="場景結果" className="grid min-w-0 gap-4">
          <TripDayContextBanner context={tripDayContext} />
          {sceneMessage ? <SceneCatalogMessage message={sceneMessage} /> : null}
          {scenes.length === 0 ? (
            <div className="rounded border border-rail bg-white p-6">
              <h2 className="text-lg font-semibold">沒有符合的場景</h2>
              <p className="mt-2 text-sm leading-6 text-night">
                請清除篩選，或改用其他作品、地點與狀態組合。
              </p>
            </div>
          ) : (
            scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                tripDayContext={tripDayContext}
                returnTo={returnTo}
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function CatalogStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-rail bg-paper px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-night">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function SceneCatalogMessage({ message }: { message: string }) {
  const isSuccess = message.includes("已刪除") || message.includes("已新增");
  const tone = isSuccess
    ? "border-[#c8ded2] bg-[#edf8f1] text-field"
    : "border-[#f1c6bb] bg-[#fff2ef] text-signal";

  return (
    <p
      aria-live="polite"
      className={["rounded border p-4 text-sm", tone].join(" ")}
    >
      {message}
    </p>
  );
}

function SceneFilterForm({
  filters,
  works,
  locations,
  tripDayId,
}: Pick<SceneCatalogProps, "filters" | "works" | "locations"> & {
  tripDayId?: string;
}) {
  return (
    <aside
      aria-label="場景篩選"
      className="min-w-0 bg-paper lg:sticky lg:top-4 lg:h-fit"
    >
      <form
        action="/scenes"
        className="grid min-w-0 gap-4 rounded border border-rail bg-white p-4"
      >
        {tripDayId ? (
          <input type="hidden" name="tripDayId" value={tripDayId} />
        ) : null}
        <h2 className="text-base font-semibold">篩選條件</h2>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          作品
          <select
            name="workId"
            aria-label="依作品篩選"
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
            aria-label="依地點篩選"
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
          狀態
          <select
            name="status"
            aria-label="依狀態篩選"
            defaultValue={filters.status ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">全部狀態</option>
            {getSceneStatusOptions().map((status) => (
              <option key={status} value={status}>
                {getSceneStatusLabel(status)}
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
            href="/scenes"
            className="flex min-h-10 w-full min-w-0 items-center justify-center rounded border border-rail px-4 text-sm font-semibold"
          >
            清除
          </Link>
        </div>
      </form>
    </aside>
  );
}

function SceneCard({
  scene,
  tripDayContext,
  returnTo,
}: {
  scene: SceneCatalogItem;
  tripDayContext?: TripDaySelectionContext;
  returnTo: string;
}) {
  return (
    <article className="rounded border border-rail bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link
            href={`/scenes/${scene.id}${
              tripDayContext ? `?tripDayId=${tripDayContext.tripDayId}` : ""
            }`}
            className="text-xl font-semibold text-field underline-offset-4 hover:underline"
          >
            {scene.sceneCode}
          </Link>
          <p className="mt-2 text-sm leading-6 text-night">
            {scene.work.name}
            {scene.episode ? ` · 第 ${scene.episode} 集` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span
            className={`w-fit rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone[scene.status]}`}
          >
            {getSceneStatusLabel(scene.status)}
          </span>
          {!tripDayContext ? (
            <form action={deleteSceneAction}>
              <input type="hidden" name="sceneId" value={scene.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SceneDeleteSubmitButton sceneCode={scene.sceneCode} />
            </form>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div className="border-t border-rail pt-3">
          <dt className="font-semibold">地點</dt>
          <dd className="mt-1 text-night">
            <Link
              href={`/locations/${scene.location.id}${
                tripDayContext ? `?tripDayId=${tripDayContext.tripDayId}` : ""
              }`}
              className="underline-offset-4 hover:underline"
            >
              {scene.location.name}
            </Link>
            {scene.location.areaName ? `, ${scene.location.areaName}` : ""}
          </dd>
        </div>
        <div className="border-t border-rail pt-3">
          <dt className="font-semibold">座標</dt>
          <dd className="mt-1 text-night">{formatSceneCoordinates(scene)}</dd>
        </div>
        <div className="border-t border-rail pt-3">
          <dt className="font-semibold">動畫檔案 ID</dt>
          <dd className="mt-1 break-all text-night">
            {scene.animeImageDriveFileId}
          </dd>
        </div>
      </dl>

      {scene.notes ? (
        <p className="mt-4 border-t border-rail pt-3 text-sm leading-6 text-night">
          {scene.notes}
        </p>
      ) : null}

      {tripDayContext ? (
        <div className="mt-4 border-t border-rail pt-4">
          <AddToTripDayForm
            tripDayId={tripDayContext.tripDayId}
            sceneId={scene.id}
            sceneCode={scene.sceneCode}
            returnTo={returnTo}
            added={isSceneAddedToTripDay(tripDayContext, scene.id)}
          />
        </div>
      ) : null}
    </article>
  );
}

function buildMapHref(
  filters: SceneCatalogFilters,
  tripDayId?: string,
): string {
  const params = new URLSearchParams();

  if (tripDayId) {
    params.set("tripDayId", tripDayId);
  }

  if (filters.workId) {
    params.set("workId", filters.workId);
  }

  if (filters.locationId) {
    params.set("locationId", filters.locationId);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return query ? `/map?${query}` : "/map";
}
