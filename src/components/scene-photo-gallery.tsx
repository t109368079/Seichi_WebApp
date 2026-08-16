import Link from "next/link";
import { deleteScenePhotoAction } from "@/app/field/actions";
import {
  formatPhotoFileSize,
  getFieldUploadHref,
  getScenePhotoHref,
  getTakeLabel,
  type ScenePhotoItem,
} from "@/application/scene-photo";

export function ScenePhotoGallery({
  photos,
  sceneId,
  sceneCode,
  tripDayId,
  tripSceneId,
}: {
  photos: readonly ScenePhotoItem[];
  sceneId: string;
  sceneCode: string;
  tripDayId: string;
  tripSceneId: string;
}) {
  return (
    <section
      aria-label={`${sceneCode} 實景照片`}
      className="rounded border border-rail bg-white/95 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">實景照片</h2>
          <p className="mt-1 text-sm text-night">
            {photos.length > 0
              ? `${photos.length} 張 Take，全部綁定 ${sceneCode}`
              : `尚未上傳實景照片`}
          </p>
        </div>
        <Link
          href={getFieldUploadHref(tripDayId, tripSceneId)}
          className="flex min-h-11 w-fit items-center rounded bg-field px-5 text-base font-semibold text-white"
        >
          上傳實景照片
        </Link>
        <Link
          href={`/reviews/${sceneId}`}
          className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-base font-semibold"
        >
          開啟審核
        </Link>
      </div>

      {photos.length > 0 ? (
        <ol className="mt-4 grid gap-4 sm:grid-cols-2" aria-label="Take 列表">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-col gap-3 rounded border border-rail bg-paper p-4"
            >
              {/* Plain img: photo bytes are served by our own route handler,
                  and next/image optimization is unnecessary for local takes. */}
              <img
                src={getScenePhotoHref(photo.id)}
                alt={`${sceneCode} ${getTakeLabel(photo.takeNumber)}`}
                className="h-48 w-full rounded border border-rail bg-white object-contain"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold">
                  {getTakeLabel(photo.takeNumber)}
                  {photo.isBest ? " · 最佳照片" : ""}
                </p>
                <p className="mt-1 break-all text-sm text-night">
                  {photo.fileName}
                </p>
                <p className="text-sm text-night">
                  {formatPhotoFileSize(photo.fileSize)}
                  {photo.capturedAt
                    ? ` · 拍攝於 ${formatTimestamp(photo.capturedAt)}`
                    : ""}
                </p>
              </div>
              <form action={deleteScenePhotoAction}>
                <input type="hidden" name="photoId" value={photo.id} />
                <input type="hidden" name="tripDayId" value={tripDayId} />
                <input type="hidden" name="tripSceneId" value={tripSceneId} />
                <button
                  type="submit"
                  aria-label={`刪除 ${getTakeLabel(photo.takeNumber)}`}
                  className="min-h-11 w-full rounded border border-rail bg-white px-4 text-sm font-semibold text-night"
                >
                  刪除這張 Take
                </button>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded border border-rail bg-paper p-4 text-sm leading-6 text-night">
          用手機拍攝後從相簿選取上傳，照片會永久綁定這個場景，不會覆蓋任何既有
          Take。
        </p>
      )}
    </section>
  );
}

function formatTimestamp(value: string): string {
  return value.slice(0, 16).replace("T", " ");
}
