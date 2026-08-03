import type { SceneCatalogItem } from "@/application/scene-catalog";
import { getAnimeImageHref } from "@/application/google-integration";

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
      <img
        src={getAnimeImageHref(scene.id)}
        alt={`${scene.sceneCode} 動畫原圖`}
        className="min-h-[16rem] w-full flex-1 rounded border border-rail bg-paper object-contain md:min-h-[22rem] lg:min-h-[26rem]"
      />
      <figcaption className="mt-4 text-sm leading-6 text-night">
        {scene.work.shortCode} - {scene.work.name}
        {scene.episode ? ` · 第 ${scene.episode} 集` : ""} ·{" "}
        <span className="break-all">{scene.animeImageDriveFileId}</span>
      </figcaption>
    </figure>
  );
}
