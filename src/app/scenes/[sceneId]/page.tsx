import Link from "next/link";
import { notFound } from "next/navigation";
import { getSceneStatusLabel } from "@/application/scene-catalog";
import { getSceneDetail } from "@/infrastructure/repositories/scene-catalog-repository";

export const dynamic = "force-dynamic";

interface SceneDetailPageProps {
  params: Promise<{
    sceneId: string;
  }>;
}

export default async function SceneDetailPage({
  params,
}: SceneDetailPageProps) {
  const { sceneId } = await params;
  const scene = await getSceneDetail(sceneId);

  if (!scene) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-white">
        <div className="mx-auto w-full max-w-4xl px-5 py-7">
          <Link
            href="/scenes"
            className="text-sm font-semibold uppercase tracking-wide text-field"
          >
            Back to scene catalog
          </Link>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            {scene.sceneCode}
          </h1>
          <p className="mt-3 text-sm leading-6 text-night">
            Permanent scene identity for {scene.work.name}.
          </p>
        </div>
      </header>

      <section
        aria-label="Scene detail"
        className="mx-auto grid w-full max-w-4xl gap-5 px-5 py-6"
      >
        <div className="rounded border border-rail bg-white p-5">
          <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{scene.work.name}</h2>
              <p className="mt-1 text-sm text-night">
                {scene.episode ? `Episode ${scene.episode}` : "No episode set"}
              </p>
            </div>
            <span className="w-fit rounded border border-rail bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-wide text-night">
              {getSceneStatusLabel(scene.status)}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <DetailRow label="Scene ID" value={scene.id} />
            <DetailRow label="Scene Code" value={scene.sceneCode} />
            <DetailRow label="Work Code" value={scene.work.shortCode} />
            <DetailRow
              label="Location"
              value={`${scene.location.name}${
                scene.location.areaName ? `, ${scene.location.areaName}` : ""
              }`}
            />
            <DetailRow
              label="Coordinates"
              value={`${scene.latitude.toFixed(5)}, ${scene.longitude.toFixed(
                5,
              )}`}
            />
            <DetailRow
              label="Anime Drive File ID"
              value={scene.animeImageDriveFileId}
            />
            <DetailRow label="Maps URL" value={scene.mapsUrl ?? "Not set"} />
            <DetailRow label="Notes" value={scene.notes ?? "Not set"} />
          </dl>
        </div>
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-rail pt-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-1 break-words text-night">{value}</dd>
    </div>
  );
}
