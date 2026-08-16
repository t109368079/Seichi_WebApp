import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToTripDayForm } from "@/components/add-to-trip-day-form";
import { TripDayContextBanner } from "@/components/trip-day-context-banner";
import {
  formatSceneCoordinates,
  getSceneStatusLabel,
} from "@/application/scene-catalog";
import { isSceneAddedToTripDay } from "@/application/trip-planning";
import { getLocationTripPlanningData } from "@/infrastructure/repositories/trip-planning-repository";

export const dynamic = "force-dynamic";

interface LocationPageProps {
  params: Promise<{
    locationId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocationPage({
  params,
  searchParams,
}: LocationPageProps) {
  const { locationId } = await params;
  const tripDayId = firstSearchParam((await searchParams).tripDayId);
  const data = await getLocationTripPlanningData(locationId, tripDayId);

  if (!data) {
    notFound();
  }

  const returnTo = tripDayId
    ? `/locations/${locationId}?tripDayId=${tripDayId}`
    : `/locations/${locationId}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/scenes" className="text-sm font-semibold text-field">
              返回場景目錄
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              {data.location.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              {data.location.areaName ?? "未設定地區"}{" "}
              這一帶可以順路收下的場景。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/trips"
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              旅行規劃
            </Link>
            <Link
              href="/map"
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              地圖檢視
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6">
        <TripDayContextBanner context={data.tripDayContext} />
        <section aria-label="地點場景" className="grid gap-4">
          {data.scenes.map((scene) => (
            <article
              key={scene.id}
              className="rounded border border-rail bg-white/95 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <Link
                    href={`/scenes/${scene.id}${
                      tripDayId ? `?tripDayId=${tripDayId}` : ""
                    }`}
                    className="text-xl font-semibold text-field underline-offset-4 hover:underline"
                  >
                    {scene.sceneCode}
                  </Link>
                  <p className="mt-2 text-sm leading-6 text-night">
                    {scene.work.shortCode} - {scene.work.name}
                    {scene.episode ? ` · 第 ${scene.episode} 集` : ""}
                  </p>
                  <p className="text-sm leading-6 text-night">
                    座標 {formatSceneCoordinates(scene)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  <span className="flex min-h-10 w-fit items-center rounded border border-rail bg-paper px-3 text-xs font-semibold text-night">
                    {getSceneStatusLabel(scene.status)}
                  </span>
                  {data.tripDayContext ? (
                    <AddToTripDayForm
                      tripDayId={data.tripDayContext.tripDayId}
                      sceneId={scene.id}
                      sceneCode={scene.sceneCode}
                      returnTo={returnTo}
                      added={isSceneAddedToTripDay(
                        data.tripDayContext,
                        scene.id,
                      )}
                    />
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
