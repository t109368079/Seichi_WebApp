import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToTripDayForm } from "@/components/add-to-trip-day-form";
import { TripDayContextBanner } from "@/components/trip-day-context-banner";
import { getSceneStatusLabel } from "@/application/scene-catalog";
import { getNavigationTarget } from "@/application/scene-map";
import { isSceneAddedToTripDay } from "@/application/trip-planning";
import { getSceneDetail } from "@/infrastructure/repositories/scene-catalog-repository";
import { getTripDaySelectionContext } from "@/infrastructure/repositories/trip-planning-repository";

export const dynamic = "force-dynamic";

interface SceneDetailPageProps {
  params: Promise<{
    sceneId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SceneDetailPage({
  params,
  searchParams,
}: SceneDetailPageProps) {
  const { sceneId } = await params;
  const tripDayId = firstSearchParam((await searchParams).tripDayId);
  const [scene, tripDayContext] = await Promise.all([
    getSceneDetail(sceneId),
    getTripDaySelectionContext(tripDayId),
  ]);

  if (!scene) {
    notFound();
  }

  const navigation = getNavigationTarget(scene);
  const returnTo = tripDayContext
    ? `/scenes/${scene.id}?tripDayId=${tripDayContext.tripDayId}`
    : `/scenes/${scene.id}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-white">
        <div className="mx-auto w-full max-w-4xl px-5 py-7">
          <Link
            href={tripDayContext ? `/scenes?tripDayId=${tripDayId}` : "/scenes"}
            className="text-sm font-semibold uppercase tracking-wide text-field"
          >
            返回場景目錄
          </Link>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            {scene.sceneCode}
          </h1>
          <p className="mt-3 text-sm leading-6 text-night">
            {scene.work.name} 的永久場景身份。
          </p>
        </div>
      </header>

      <section
        aria-label="場景詳情"
        className="mx-auto grid w-full max-w-4xl gap-5 px-5 py-6"
      >
        <TripDayContextBanner context={tripDayContext} />
        <div className="rounded border border-rail bg-white p-5">
          <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{scene.work.name}</h2>
              <p className="mt-1 text-sm text-night">
                {scene.episode ? `第 ${scene.episode} 集` : "未設定集數"}
              </p>
            </div>
            <span className="w-fit rounded border border-rail bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-wide text-night">
              {getSceneStatusLabel(scene.status)}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/map?locationId=${scene.location.id}${
                tripDayContext ? `&tripDayId=${tripDayContext.tripDayId}` : ""
              }`}
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              在地圖查看
            </Link>
            <Link
              href={`/reviews/${scene.id}`}
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              開啟審核
            </Link>
            {navigation.href ? (
              <a
                href={navigation.href}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-10 w-fit items-center rounded bg-field px-4 text-sm font-semibold text-white"
              >
                開啟導航
              </a>
            ) : (
              <span className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold text-night">
                {navigation.disabledReason ?? "無法導航"}
              </span>
            )}
            {tripDayContext ? (
              <AddToTripDayForm
                tripDayId={tripDayContext.tripDayId}
                sceneId={scene.id}
                sceneCode={scene.sceneCode}
                returnTo={returnTo}
                added={isSceneAddedToTripDay(tripDayContext, scene.id)}
              />
            ) : null}
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <DetailRow label="場景 ID" value={scene.id} />
            <DetailRow label="場景代碼" value={scene.sceneCode} />
            <DetailRow label="作品代碼" value={scene.work.shortCode} />
            <DetailRow
              label="地點"
              value={`${scene.location.name}${
                scene.location.areaName ? `, ${scene.location.areaName}` : ""
              }`}
            />
            <DetailRow
              label="座標"
              value={`${scene.latitude.toFixed(5)}, ${scene.longitude.toFixed(
                5,
              )}`}
            />
            <DetailRow
              label="動畫 Drive 檔案 ID"
              value={scene.animeImageDriveFileId}
            />
            <DetailRow label="地圖 URL" value={scene.mapsUrl ?? "未設定"} />
            <DetailRow label="備註" value={scene.notes ?? "未設定"} />
          </dl>
        </div>
      </section>
    </main>
  );
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-rail pt-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-1 break-words text-night">{value}</dd>
    </div>
  );
}
