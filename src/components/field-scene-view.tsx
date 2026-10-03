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
import {
  formatPhotoFileSize,
  getFieldUploadHref,
  getScenePhotoHref,
  getTakeLabel,
  type ScenePhotoItem,
} from "@/application/scene-photo";

const fieldDisplayModes = ["photo", "anime", "preview"] as const;

type FieldDisplayMode = (typeof fieldDisplayModes)[number];

export function FieldSceneView({
  day,
  cursor,
  photos,
  message,
  displayMode,
}: {
  day: FieldDayView;
  cursor: FieldSceneCursor;
  photos: readonly ScenePhotoItem[];
  message?: string;
  displayMode?: string;
}) {
  const { current, previous, next, position, total } = cursor;
  const scene = current.scene;
  const navigation = getNavigationTarget(scene);
  const latestPhoto = photos[photos.length - 1];
  const selectedDisplayMode = resolveFieldDisplayMode(
    displayMode,
    photos.length > 0,
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6">
      {message ? (
        <p
          role="status"
          className="rounded border border-rail bg-white/95 p-4 shadow-sm text-sm font-semibold text-night"
        >
          {message}
        </p>
      ) : null}

      <section aria-label="現地顯示模式" className="grid gap-4">
        <DisplayModeTabs
          tripDayId={day.tripDayId}
          tripSceneId={current.id}
          selectedMode={selectedDisplayMode}
        />
        <FieldMediaDisplay
          mode={selectedDisplayMode}
          scene={scene}
          photo={latestPhoto}
          tripDayId={day.tripDayId}
          tripSceneId={current.id}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded border border-rail bg-white/95 p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-night">
                第 {position} / {total} 個場景
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{scene.sceneCode}</h2>
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

        <section className="grid content-start gap-5">
          <div className="rounded border border-rail bg-white/95 p-5 shadow-sm">
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
          </div>

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
        </section>
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

function DisplayModeTabs({
  tripDayId,
  tripSceneId,
  selectedMode,
}: {
  tripDayId: string;
  tripSceneId: string;
  selectedMode: FieldDisplayMode;
}) {
  return (
    <nav
      aria-label="顯示模式"
      className="flex w-fit flex-wrap gap-2 rounded border border-rail bg-white/95 p-2 shadow-sm"
    >
      {fieldDisplayModes.map((mode) => (
        <Link
          key={mode}
          href={getFieldSceneDisplayHref(tripDayId, tripSceneId, mode)}
          aria-current={selectedMode === mode ? "page" : undefined}
          className={`flex min-h-11 items-center rounded px-4 text-sm font-semibold ${
            selectedMode === mode
              ? "bg-field text-white"
              : "bg-paper text-night"
          }`}
        >
          {getFieldDisplayModeLabel(mode)}
        </Link>
      ))}
    </nav>
  );
}

function FieldMediaDisplay({
  mode,
  scene,
  photo,
  tripDayId,
  tripSceneId,
}: {
  mode: FieldDisplayMode;
  scene: FieldSceneCursor["current"]["scene"];
  photo?: ScenePhotoItem;
  tripDayId: string;
  tripSceneId: string;
}) {
  if (mode === "preview") {
    return (
      <section
        aria-label="動畫與實景預覽"
        className="grid gap-5 lg:grid-cols-2"
      >
        <AnimeReferencePanel scene={scene} />
        <RealPhotoPanel
          sceneCode={scene.sceneCode}
          photo={photo}
          tripDayId={tripDayId}
          tripSceneId={tripSceneId}
        />
      </section>
    );
  }

  if (mode === "photo") {
    return (
      <RealPhotoPanel
        sceneCode={scene.sceneCode}
        photo={photo}
        tripDayId={tripDayId}
        tripSceneId={tripSceneId}
      />
    );
  }

  return <AnimeReferencePanel scene={scene} />;
}

function RealPhotoPanel({
  sceneCode,
  photo,
  tripDayId,
  tripSceneId,
}: {
  sceneCode: string;
  photo?: ScenePhotoItem;
  tripDayId: string;
  tripSceneId: string;
}) {
  if (!photo) {
    return (
      <section
        aria-label={`${sceneCode} 實景對照圖`}
        className="flex min-h-[18rem] flex-col justify-center rounded border border-rail bg-white/95 p-6 text-center shadow-sm md:min-h-[24rem] lg:min-h-[28rem]"
      >
        <h2 className="text-2xl font-semibold">尚無實景照片</h2>
        <Link
          href={getFieldUploadHref(tripDayId, tripSceneId)}
          className="mx-auto mt-5 flex min-h-11 w-fit items-center rounded bg-field px-5 text-base font-semibold text-white"
        >
          上傳實景照片
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label={`${sceneCode} 實景對照圖`}
      className="rounded border border-rail bg-white/95 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold">
            {getTakeLabel(photo.takeNumber)}
          </h2>
          <p className="mt-1 break-all text-sm text-night">{photo.fileName}</p>
          <p className="text-sm text-night">
            {formatPhotoFileSize(photo.fileSize)}
            {photo.capturedAt ? ` · ${formatTimestamp(photo.capturedAt)}` : ""}
          </p>
        </div>
        {photo.isBest ? (
          <span className="flex min-h-11 w-fit items-center rounded border border-rail bg-[#edf8f1] px-4 text-sm font-semibold text-field">
            最佳照片
          </span>
        ) : null}
      </div>
      <img
        src={getScenePhotoHref(photo.id)}
        alt={`${sceneCode} ${getTakeLabel(photo.takeNumber)} 實景照片`}
        className="mt-5 h-[28rem] w-full rounded border border-rail bg-paper object-contain"
      />
      <a
        href={getScenePhotoHref(photo.id)}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex min-h-11 w-fit items-center rounded border border-rail px-5 text-base font-semibold"
      >
        開啟實景照片
      </a>
    </section>
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

function getFieldSceneDisplayHref(
  tripDayId: string,
  tripSceneId: string,
  mode: FieldDisplayMode,
): string {
  const params = new URLSearchParams({ view: mode });

  return `${getFieldSceneHref(tripDayId, tripSceneId)}?${params.toString()}`;
}

function resolveFieldDisplayMode(
  value: string | undefined,
  hasPhotos: boolean,
): FieldDisplayMode {
  if (
    fieldDisplayModes.includes(value as FieldDisplayMode) &&
    value !== undefined
  ) {
    return value as FieldDisplayMode;
  }

  return hasPhotos ? "photo" : "anime";
}

function getFieldDisplayModeLabel(mode: FieldDisplayMode): string {
  if (mode === "photo") {
    return "實景模式";
  }

  if (mode === "preview") {
    return "預覽模式";
  }

  return "動畫模式";
}

function formatTimestamp(value: string): string {
  return value.slice(0, 16).replace("T", " ");
}
