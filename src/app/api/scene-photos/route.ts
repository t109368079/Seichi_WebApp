import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { uploadScenePhoto } from "@/infrastructure/repositories/scene-photo-repository";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";

export const dynamic = "force-dynamic";

/**
 * Upload runs through a route handler rather than a server action because the
 * server action body limit is 1MB and phone photos are several megabytes.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "無法讀取上傳內容，請重試。" },
      { status: 400 },
    );
  }

  const sceneId = readField(formData, "sceneId");
  const tripId = readField(formData, "tripId");
  const tripDayId = readField(formData, "tripDayId");
  const capturedAtRaw = readField(formData, "capturedAt");
  const file = formData.get("photo");

  if (!sceneId) {
    return NextResponse.json({ message: "缺少場景 ID。" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "請選擇一張照片。" }, { status: 400 });
  }

  try {
    const googleSessionToken = await readGoogleSessionCookie();
    const result = await uploadScenePhoto({
      sceneId,
      tripId: tripId || undefined,
      tripDayId: tripDayId || undefined,
      fileName: file.name,
      mimeType: file.type,
      capturedAt: parseCapturedAt(capturedAtRaw),
      bytes: new Uint8Array(await file.arrayBuffer()),
      googleSessionToken,
    });

    if (tripDayId) {
      revalidatePath(`/field/${tripDayId}`);
    }

    return NextResponse.json(
      {
        photoId: result.photo.id,
        takeNumber: result.photo.takeNumber,
        status: result.status,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: translateUploadError(error) },
      { status: uploadErrorStatus(error) },
    );
  }
}

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function parseCapturedAt(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function uploadErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("does not exist")) {
    return 404;
  }

  if (
    message.includes("Unsupported photo type") ||
    message.includes("upload limit") ||
    message.includes("Photo file is empty") ||
    message.includes("fileName is required")
  ) {
    return 400;
  }

  return 500;
}

function translateUploadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Unsupported photo type")) {
    return "只接受 JPEG、PNG 或 WebP 格式的照片。";
  }

  if (message.includes("upload limit")) {
    return "照片超過 15 MB 上傳上限。";
  }

  if (message.includes("Photo file is empty")) {
    return "照片內容為空。";
  }

  if (message.includes("Scene does not exist")) {
    return "找不到指定的場景，未上傳任何照片。";
  }

  if (message.includes("Trip day does not exist")) {
    return "找不到指定的行程日期。";
  }

  if (message.includes("Illegal SceneStatus transition")) {
    return "此場景目前的狀態不允許透過上傳變更。";
  }

  return "照片上傳失敗，場景狀態未變更。";
}
