import Link from "next/link";
import { AnimeReferencePanel } from "@/components/anime-reference-panel";
import { FieldStatusActions } from "@/components/field-status-actions";
import { ScenePhotoGallery } from "@/components/scene-photo-gallery";
import {
  getFieldDayHref,
  getFieldSceneHref,
  type FieldDayView,
  type FieldSceneCursor,
} from "@/application/field-mode";
import { getSceneStatusLabel } from "@/application/scene-catalog";
import { getNavigationTarget } from "@/application/scene-map";
import type { ScenePhotoItem } from "@/application/scene-photo";

export function FieldSceneView({
  day,
  cursor,
  photos,
  message,
}: {
  day: FieldDayView;
  cursor: FieldSceneCursor;
  photos: readonly ScenePhotoItem[];
  message?: string;
}) {
  const { current, previous, next, position, total } = cursor;
  const scene = current.scene;
  const navigation = getNavigationTarget(scene);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6">
      {message ? (
        <p
          role="status"
          className="rounded border border-rail bg-white p-4 text-sm font-semibold text-night"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AnimeReferencePanel scene={scene} />

        <div className="grid content-start gap-5">
          <section className="rounded border border-rail bg-white p-5">
            <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-night">
                  第 {position} / {total} 個場景
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {scene.sceneCode}
                </h2>
              </div>
              <span
                aria-label="目前狀態"
                className="flex min-h-11 w-fit items-center rounded border border-rail bg-paper px-4 text-sm font-semibold text-night"
              >
                {getSceneStatusLabel(scene.status)}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-base">
              <FieldDetail
                label="地點"
                value={`${scene.location.name}${
                  scene.location.areaName ? `, ${scene.location.areaName}` : ""
                }`}
              />
              <FieldDetail label="備註" value={scene.notes ?? "未設定"} />
            </dl>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {navigation.href ? (
                <a
                  href={navigation.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 w-fit items-center rounded bg-field px-5 text-base font-semibold text-white"
                >
                  開啟導航
                </a>
              ) : (
                <span className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-base font-semibold text-night">
                  {navigation.disabledReason ?? "無法導航"}
                </span>
              )}
              <Link
                href={`/scenes/${scene.id}`}
                className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-base font-semibold"
              >
                場景詳情
              </Link>
            </div>
          </section>

          <section className="rounded border border-rail bg-white p-5">
            <h2 className="text-lg font-semibold">現地狀態</h2>
            <div className="mt-4">
              <FieldStatusActions
                sceneId={scene.id}
                sceneCode={scene.sceneCode}
                status={scene.status}
                tripDayId={day.tripDayId}
                tripSceneId={current.id}
              />
            </div>
          </section>

          <nav
            aria-label="場景切換"
            className="flex flex-col gap-3 sm:flex-row sm:justify-between"
          >
            <CursorLink
              tripDayId={day.tripDayId}
              tripSceneId={previous?.id}
              label="上一個場景"
            />
            <CursorLink
              tripDayId={day.tripDayId}
              tripSceneId={next?.id}
              label="下一個場景"
            />
          </nav>

          <Link
            href={getFieldDayHref(day.tripDayId)}
            className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-base font-semibold"
          >
            返回今日行程
          </Link>
        </div>
      </div>

      <ScenePhotoGallery
        photos={photos}
        sceneId={scene.id}
        sceneCode={scene.sceneCode}
        tripDayId={day.tripDayId}
        tripSceneId={current.id}
      />
    </div>
  );
}

function CursorLink({
  tripDayId,
  tripSceneId,
  label,
}: {
  tripDayId: string;
  tripSceneId?: string;
  label: string;
}) {
  if (!tripSceneId) {
    return (
      <span
        aria-disabled="true"
        className="flex min-h-11 flex-1 items-center justify-center rounded border border-rail bg-paper px-5 text-base font-semibold text-night opacity-40"
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={getFieldSceneHref(tripDayId, tripSceneId)}
      className="flex min-h-11 flex-1 items-center justify-center rounded border border-rail bg-white px-5 text-base font-semibold"
    >
      {label}
    </Link>
  );
}

function FieldDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-rail pt-3">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="mt-1 break-words leading-7 text-night">{value}</dd>
    </div>
  );
}
