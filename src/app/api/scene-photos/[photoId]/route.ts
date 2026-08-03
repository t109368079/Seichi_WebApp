import { NextResponse } from "next/server";
import { readScenePhotoBytes } from "@/infrastructure/repositories/scene-photo-repository";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import { PhotoNotFoundError } from "@/infrastructure/storage/photo-storage";

export const dynamic = "force-dynamic";

interface ScenePhotoRouteContext {
  params: Promise<{
    photoId: string;
  }>;
}

/**
 * Serves stored bytes through the storage adapter so the browser never needs a
 * direct filesystem path, and Phase 8 can swap in Drive without changing URLs.
 */
export async function GET(
  _request: Request,
  context: ScenePhotoRouteContext,
): Promise<NextResponse> {
  const { photoId } = await context.params;

  try {
    const googleSessionToken = await readGoogleSessionCookie();
    const photo = await readScenePhotoBytes(photoId, googleSessionToken);

    if (!photo) {
      return NextResponse.json({ message: "找不到照片。" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(photo.bytes), {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": `${photo.bytes.byteLength}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    if (error instanceof PhotoNotFoundError) {
      return NextResponse.json(
        { message: "照片檔案已遺失。" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "讀取照片失敗。" }, { status: 500 });
  }
}
