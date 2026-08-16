import Link from "next/link";
import { notFound } from "next/navigation";
import { ScenePhotoUploadForm } from "@/components/scene-photo-upload-form";
import {
  getGoogleIntegrationHref,
  hasGooglePhotosPickerScope,
} from "@/application/google-integration";
import { getFieldSceneHref } from "@/application/field-mode";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import { getFieldModeScene } from "@/infrastructure/repositories/field-mode-repository";
import { getGoogleIntegrationStatus } from "@/infrastructure/repositories/google-integration-repository";
import { isGoogleDrivePhotoStorageEnabled } from "@/infrastructure/storage/local-photo-storage";

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
  const googleSessionToken = await readGoogleSessionCookie();
  const googleStatus = await getGoogleIntegrationStatus(googleSessionToken);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          <Link
            href={getFieldSceneHref(tripDayId, tripSceneId)}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-field"
          >
            返回場景
          </Link>
          <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
            上傳實景照片
          </h1>
          <p className="mt-2 text-base leading-7 text-night">
            {view.day.tripName} · {view.day.date} · 把剛拍好的照片綁回這一幕。
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
          googlePhotosImportEnabled={isGoogleDrivePhotoStorageEnabled()}
          googleConnected={googleStatus.connected}
          googlePhotosScopeGranted={hasGooglePhotosPickerScope(
            googleStatus.scopes,
          )}
          googleIntegrationHref={getGoogleIntegrationHref()}
        />
      </div>
    </main>
  );
}
