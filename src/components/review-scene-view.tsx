import Link from "next/link";
import {
  applyReviewStatusAction,
  selectBestPhotoAction,
} from "@/app/reviews/actions";
import { AnimeReferencePanel } from "@/components/anime-reference-panel";
import {
  canReviewSceneBeCompleted,
  getReviewPhotoHref,
  getReviewSceneHref,
  getReviewStatusActionLabel,
  getReviewStatusHelper,
  getSceneStatusReviewLabel,
  type ReviewSceneDetail,
} from "@/application/review";
import { formatPhotoFileSize, getTakeLabel } from "@/application/scene-photo";

export function ReviewSceneView({
  detail,
  message,
}: {
  detail: ReviewSceneDetail;
  message?: string;
}) {
  const scene = detail.scene;
  const selectedPhoto = detail.selectedPhoto;
  const canComplete = canReviewSceneBeCompleted(detail);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto w-full max-w-6xl px-5 py-7">
          <Link href="/reviews" className="text-sm font-semibold text-field">
            返回審核佇列
          </Link>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold md:text-4xl">
                {scene.sceneCode}
              </h1>
              <p className="mt-3 text-sm leading-6 text-night">
                {scene.work.name}
                {scene.episode ? ` · 第 ${scene.episode} 集` : ""} ·{" "}
                {scene.location.name}
              </p>
            </div>
            <span className="flex min-h-11 w-fit items-center rounded border border-rail bg-paper px-4 text-sm font-semibold text-night">
              {getSceneStatusReviewLabel(scene.status)}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6">
        {message ? (
          <p
            role="status"
            className="rounded border border-rail bg-white/95 p-4 shadow-sm text-sm font-semibold text-night"
          >
            {message}
          </p>
        ) : null}

        <section
          aria-label="動畫與實景比較"
          className="grid gap-5 lg:grid-cols-2"
        >
          <AnimeReferencePanel scene={scene} />
          <RealPhotoPanel sceneCode={scene.sceneCode} photo={selectedPhoto} />
        </section>

        <section
          aria-label="Take 切換"
          className="rounded border border-rail bg-white/95 p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">實景 Take</h2>
              <p className="mt-1 text-sm text-night">
                {detail.photos.length > 0
                  ? `${detail.photos.length} 張照片，全部綁定 ${scene.sceneCode}`
                  : "尚未上傳實景照片"}
              </p>
            </div>
            {detail.bestPhoto ? (
              <span className="flex min-h-11 w-fit items-center rounded border border-rail bg-[#edf8f1] px-4 text-sm font-semibold text-field">
                目前最佳：{getTakeLabel(detail.bestPhoto.takeNumber)}
              </span>
            ) : null}
          </div>

          {detail.photos.length > 0 ? (
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detail.photos.map((photo) => (
                <li
                  key={photo.id}
                  className={`rounded border p-4 ${
                    selectedPhoto?.id === photo.id
                      ? "border-field bg-[#eef6ff]"
                      : "border-rail bg-paper"
                  }`}
                >
                  <Link
                    href={getReviewSceneHref(scene.id, photo.id)}
                    aria-label={`查看 ${getTakeLabel(photo.takeNumber)}`}
                    className="block"
                  >
                    <img
                      src={getReviewPhotoHref(photo.id)}
                      alt={`${scene.sceneCode} ${getTakeLabel(photo.takeNumber)}`}
                      className="h-36 w-full rounded border border-rail bg-white object-contain"
                    />
                  </Link>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {getTakeLabel(photo.takeNumber)}
                      </p>
                      <p className="mt-1 break-all text-sm text-night">
                        {photo.fileName}
                      </p>
                      <p className="text-sm text-night">
                        {formatPhotoFileSize(photo.fileSize)}
                      </p>
                    </div>
                    {photo.isBest ? (
                      <span className="rounded border border-rail bg-white px-3 py-1 text-xs font-semibold text-field">
                        最佳
                      </span>
                    ) : null}
                  </div>
                  {!photo.isBest ? (
                    <form action={selectBestPhotoAction} className="mt-4">
                      <input type="hidden" name="photoId" value={photo.id} />
                      <input type="hidden" name="sceneId" value={scene.id} />
                      <button
                        type="submit"
                        aria-label={`設為最佳照片 ${getTakeLabel(photo.takeNumber)}`}
                        className="min-h-11 w-full rounded bg-field px-4 text-sm font-semibold text-white"
                      >
                        設為最佳照片
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded border border-rail bg-paper p-4 text-sm leading-6 text-night">
              請先從 Field Mode 上傳實景照片，再回到這裡選擇最佳 Take。
            </p>
          )}
        </section>

        <section
          aria-label="審核狀態"
          className="rounded border border-rail bg-white/95 p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">審核狀態</h2>
          <p className="mt-2 text-sm leading-6 text-night">
            {getReviewStatusHelper(detail)}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {scene.status === "PENDING_REVIEW" ? (
              <>
                <ReviewStatusButton
                  sceneId={scene.id}
                  action="MARK_REVIEWED"
                  disabled={!canComplete}
                />
                <ReviewStatusButton
                  sceneId={scene.id}
                  action="MARK_RETAKE_REQUIRED"
                />
              </>
            ) : null}
            {scene.status === "RETAKE_REQUIRED" ? (
              <ReviewStatusButton
                sceneId={scene.id}
                action="MARK_PENDING_REVIEW"
              />
            ) : null}
            {scene.status !== "PENDING_REVIEW" &&
            scene.status !== "RETAKE_REQUIRED" ? (
              <span className="flex min-h-11 w-fit items-center rounded border border-rail bg-paper px-5 text-base font-semibold text-night">
                目前沒有可用的審核狀態操作
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function RealPhotoPanel({
  sceneCode,
  photo,
}: {
  sceneCode: string;
  photo?: ReviewSceneDetail["selectedPhoto"];
}) {
  if (!photo) {
    return (
      <section className="flex min-h-[28rem] flex-col justify-center rounded border border-rail bg-white/95 p-6 shadow-sm text-center">
        <h2 className="text-2xl font-semibold">尚無實景照片</h2>
        <p className="mt-3 text-sm leading-6 text-night">
          上傳 Take 後會在這裡與動畫參考並排比較。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border border-rail bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {getTakeLabel(photo.takeNumber)}
          </h2>
          <p className="mt-1 break-all text-sm text-night">{photo.fileName}</p>
        </div>
        {photo.isBest ? (
          <span className="flex min-h-11 w-fit items-center rounded border border-rail bg-[#edf8f1] px-4 text-sm font-semibold text-field">
            最佳照片
          </span>
        ) : null}
      </div>
      <img
        src={getReviewPhotoHref(photo.id)}
        alt={`${sceneCode} ${getTakeLabel(photo.takeNumber)} 實景照片`}
        className="mt-5 h-[28rem] w-full rounded border border-rail bg-paper object-contain"
      />
      <a
        href={getReviewPhotoHref(photo.id)}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex min-h-11 w-fit items-center rounded border border-rail px-5 text-base font-semibold"
      >
        開啟實景照片
      </a>
    </section>
  );
}

function ReviewStatusButton({
  sceneId,
  action,
  disabled = false,
}: {
  sceneId: string;
  action: "MARK_REVIEWED" | "MARK_RETAKE_REQUIRED" | "MARK_PENDING_REVIEW";
  disabled?: boolean;
}) {
  return (
    <form action={applyReviewStatusAction}>
      <input type="hidden" name="sceneId" value={sceneId} />
      <input type="hidden" name="action" value={action} />
      <button
        type="submit"
        disabled={disabled}
        className="min-h-11 w-full rounded bg-field px-5 text-base font-semibold text-white disabled:opacity-40 sm:w-auto"
      >
        {getReviewStatusActionLabel(action)}
      </button>
    </form>
  );
}
