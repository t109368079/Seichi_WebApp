import { NextResponse } from "next/server";
import { requireAppRouteAccess } from "@/app/access-control";
import { GoogleApiError } from "@/infrastructure/google/google-http";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import {
  createGooglePhotosPickerSessionForAccount,
  GooglePhotosImportError,
} from "@/infrastructure/repositories/google-photos-picker-repository";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const accessDenied = await requireAppRouteAccess();

  if (accessDenied) {
    return accessDenied;
  }

  try {
    const session = await createGooglePhotosPickerSessionForAccount(
      await readGoogleSessionCookie(),
    );

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: translateGooglePhotosPickerError(error) },
      { status: googlePhotosPickerErrorStatus(error) },
    );
  }
}

function googlePhotosPickerErrorStatus(error: unknown): number {
  if (error instanceof GooglePhotosImportError) {
    return error.code === "google_session" ? 401 : 400;
  }

  if (error instanceof GoogleApiError) {
    if (error.status === 401 || error.status === 403) {
      return error.status;
    }

    return 502;
  }

  return 500;
}

function translateGooglePhotosPickerError(error: unknown): string {
  if (error instanceof GooglePhotosImportError) {
    if (error.code === "google_session") {
      return "請先連接 Google，或重新授權 Google Photos Picker 權限。";
    }
  }

  if (error instanceof GoogleApiError) {
    if (error.status === 403) {
      return "Google 權限不足，請重新連接 Google 並允許 Google 相簿選取權限。";
    }

    return `Google Photos Picker 建立失敗：${error.message}`;
  }

  return "無法建立 Google 相簿選取工作階段。";
}
