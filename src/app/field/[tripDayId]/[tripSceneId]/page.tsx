import Link from "next/link";
import { notFound } from "next/navigation";
import { FieldSceneView } from "@/components/field-scene-view";
import { getFieldDayHref } from "@/application/field-mode";
import { getFieldModeScene } from "@/infrastructure/repositories/field-mode-repository";
import { listScenePhotos } from "@/infrastructure/repositories/scene-photo-repository";

export const dynamic = "force-dynamic";

interface FieldScenePageProps {
  params: Promise<{
    tripDayId: string;
    tripSceneId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FieldScenePage({
  params,
  searchParams,
}: FieldScenePageProps) {
  const { tripDayId, tripSceneId } = await params;
  const message = firstSearchParam((await searchParams).fieldMessage);
  const view = await getFieldModeScene(tripDayId, tripSceneId);

  if (!view) {
    notFound();
  }

  const photos = await listScenePhotos(view.cursor.current.scene.id);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto w-full max-w-6xl px-5 py-6">
          <Link
            href={getFieldDayHref(view.day.tripDayId)}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-field"
          >
            返回今日行程
          </Link>
          <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
            {view.cursor.current.scene.sceneCode}
          </h1>
          <p className="mt-2 text-base leading-7 text-night">
            {view.day.tripName} · {view.day.date} · 對照動畫畫面，拍下這一幕。
          </p>
        </div>
      </header>

      <FieldSceneView
        day={view.day}
        cursor={view.cursor}
        photos={photos}
        message={message}
      />
    </main>
  );
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
