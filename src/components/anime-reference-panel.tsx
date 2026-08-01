import type { SceneCatalogItem } from "@/application/scene-catalog";

/**
 * The anime reference must render for every SceneStatus. Phase 5 deliberately
 * has no code path that hides or removes it, because "deleting the anime image
 * to represent completion" is the exact workflow this product replaces.
 */
export function AnimeReferencePanel({ scene }: { scene: SceneCatalogItem }) {
  return (
    <figure
      aria-label={`${scene.sceneCode} 動畫參考圖`}
      className="flex min-h-[18rem] flex-col justify-between rounded border border-rail bg-white p-6 md:min-h-[24rem] lg:min-h-[28rem]"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded border border-dashed border-rail bg-paper p-6 text-center">
        <p className="text-3xl font-semibold md:text-4xl">{scene.sceneCode}</p>
        <p className="text-base text-night md:text-lg">
          {scene.work.shortCode} - {scene.work.name}
          {scene.episode ? ` · 第 ${scene.episode} 集` : ""}
        </p>
        <p className="break-all text-sm text-night">
          {scene.animeImageDriveFileId}
        </p>
      </div>
      <figcaption className="mt-4 text-sm leading-6 text-night">
        動畫原圖待 Phase 8 接入 Google Drive。此參考面板不會因為狀態變更而移除。
      </figcaption>
    </figure>
  );
}
