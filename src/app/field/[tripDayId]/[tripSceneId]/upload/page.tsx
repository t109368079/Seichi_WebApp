import Link from "next/link";
import { notFound } from "next/navigation";
import { ScenePhotoUploadForm } from "@/components/scene-photo-upload-form";
import { getFieldSceneHref } from "@/application/field-mode";
import { getFieldModeScene } from "@/infrastructure/repositories/field-mode-repository";

export const dynamic = "force-dynamic";

interface ScenePhotoUploadPageProps {
  params: Promise<{
    tripDayId: string;
    tripSceneId: string;
  }>;
}

export default async function ScenePhotoUploadPage({
  params,
}: ScenePhotoUploadPageProps) {
  const { tripDayId, tripSceneId } = await params;
  const view = await getFieldModeScene(tripDayId, tripSceneId);

  if (!view) {
    notFound();
  }

  const scene = view.cursor.current.scene;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-white">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          <Link
            href={getFieldSceneHref(tripDayId, tripSceneId)}
            className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-wide text-field"
          >
            返回場景
          </Link>
          <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
            上傳實景照片
          </h1>
          <p className="mt-2 text-base leading-7 text-night">
            {view.day.tripName} · {view.day.date}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 py-6">
        <ScenePhotoUploadForm
          sceneId={scene.id}
          sceneCode={scene.sceneCode}
          tripId={view.day.tripId}
          tripDayId={tripDayId}
          tripSceneId={tripSceneId}
        />
      </div>
    </main>
  );
}
