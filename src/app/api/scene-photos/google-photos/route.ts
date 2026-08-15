import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { GoogleApiError } from "@/infrastructure/google/google-http";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import {
  importGooglePhotosPickedMediaItem,
  GooglePhotosImportError,
} from "@/infrastructure/repositories/google-photos-picker-repository";

export const dynamic = "force-dynamic";

interface GooglePhotosImportRequestBody {
  sceneId?: string;
  tripId?: string;
  tripDayId?: string;
  pickerSessionId?: string;
  mediaItemId?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: GooglePhotosImportRequestBody;

  try {
    body = (await request.json()) as GooglePhotosImportRequestBody;
  } catch {
    return NextResponse.json(
      { message: "無法讀取 Google 相簿匯入內容，請重試。" },
      { status: 400 },
    );
  }

  const sceneId = body.sceneId?.trim() ?? "";
  const tripId = body.tripId?.trim() || undefined;
  const tripDayId = body.tripDayId?.trim() || undefined;
  const pickerSessionId = body.pickerSessionId?.trim() ?? "";
  const mediaItemId = body.mediaItemId?.trim() || undefined;

  if (!sceneId) {
    return NextResponse.json({ message: "缺少場景 ID。" }, { status: 400 });
  }

  if (!pickerSessionId) {
    return NextResponse.json(
      { message: "缺少 Google 相簿選取工作階段。" },
      { status: 400 },
    );
  }

  try {
    const result = await importGooglePhotosPickedMediaItem({
      googleSessionToken: (await readGoogleSessionCookie()) ?? "",
      sceneId,
      tripId,
      tripDayId,
      pickerSessionId,
      mediaItemId,
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
      { message: translateGooglePhotosImportError(error) },
      { status: googlePhotosImportErrorStatus(error) },
    );
  }
}

function googlePhotosImportErrorStatus(error: unknown): number {
  if (error instanceof GooglePhotosImportError) {
    if (error.code === "google_session") {
      return 401;
    }

    if (error.code === "storage_backend") {
      return 409;
    }

    if (error.code === "not_found") {
      return 404;
    }

    return 400;
  }

  if (error instanceof GoogleApiError) {
    if (error.status === 401 || error.status === 403) {
      return error.status;
    }

    return 502;
  }

  const message = error instanceof Error ? error.message : "";

  if (message.includes("Scene does not exist")) {
    return 404;
  }

  if (
    message.includes("Trip day does not exist") ||
    message.includes("Unsupported photo type") ||
    message.includes("upload limit") ||
    message.includes("Photo file is empty") ||
    message.includes("fileName is required")
  ) {
    return 400;
  }

  return 500;
}

function translateGooglePhotosImportError(error: unknown): string {
  if (error instanceof GooglePhotosImportError) {
    if (error.code === "storage_backend") {
      return "Google 相簿匯入需啟用 Google Drive 照片儲存，避免在本機留下永久副本。";
    }

    if (error.code === "google_session") {
      return "請先連接 Google，或重新授權 Google Photos Picker 權限。";
    }

    if (error.code === "not_ready") {
      return "Google 相簿尚未完成選取，請回到選取視窗按完成。";
    }

    if (error.code === "not_found") {
      return "找不到指定的 Google 相簿照片，請重新選取。";
    }

    if (error.code === "unsupported_type") {
      return "目前只支援從 Google 相簿匯入 JPEG、PNG 或 WebP 照片。";
    }
  }

  if (error instanceof GoogleApiError) {
    if (error.status === 403) {
      return "Google 權限不足，請重新連接 Google 並允許 Google 相簿與 Drive 權限。";
    }

    return `Google 相簿匯入失敗：${error.message}`;
  }

  const message = error instanceof Error ? error.message : "";

  if (message.includes("Scene does not exist")) {
    return "找不到指定的場景，未匯入任何照片。";
  }

  if (message.includes("Trip day does not exist")) {
    return "找不到指定的行程日期。";
  }

  if (message.includes("Unsupported photo type")) {
    return "目前只支援 JPEG、PNG 或 WebP 照片。";
  }

  if (message.includes("upload limit")) {
    return "照片超過 15 MB 上傳上限。";
  }

  if (message.includes("Photo file is empty")) {
    return "照片內容為空。";
  }

  return "Google 相簿照片匯入失敗，場景狀態未變更。";
}
