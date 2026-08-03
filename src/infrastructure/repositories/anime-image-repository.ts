import {
  downloadGoogleDriveFile,
  getGoogleDriveFileMetadata,
} from "@/infrastructure/google/google-drive";
import { GoogleApiError } from "@/infrastructure/google/google-http";
import {
  getGoogleAccessTokenForSession,
  GoogleSessionError,
} from "@/infrastructure/repositories/google-integration-repository";
import { prisma } from "@/infrastructure/database/prisma";

export interface AnimeImageResult {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  sceneCode: string;
  driveFileId: string;
}

export class AnimeImageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AnimeImageError";
  }
}

export async function readAnimeImageForScene(
  sceneId: string,
  googleSessionToken?: string,
): Promise<AnimeImageResult> {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: {
      sceneCode: true,
      animeImageDriveFileId: true,
    },
  });

  if (!scene) {
    throw new AnimeImageError("找不到場景。", 404);
  }

  if (!googleSessionToken) {
    throw new AnimeImageError("請先連接 Google。", 401);
  }

  try {
    const accessToken =
      await getGoogleAccessTokenForSession(googleSessionToken);
    const metadata = await getGoogleDriveFileMetadata(
      scene.animeImageDriveFileId,
      accessToken,
    );

    if (!metadata.mimeType.startsWith("image/")) {
      throw new AnimeImageError("Drive 檔案不是圖片。", 415);
    }

    const downloaded = await downloadGoogleDriveFile(
      scene.animeImageDriveFileId,
      accessToken,
    );

    return {
      bytes: downloaded.bytes,
      mimeType: metadata.mimeType,
      fileName: metadata.name,
      sceneCode: scene.sceneCode,
      driveFileId: scene.animeImageDriveFileId,
    };
  } catch (error) {
    if (error instanceof AnimeImageError) {
      throw error;
    }

    if (error instanceof GoogleSessionError) {
      throw new AnimeImageError(error.message, 401);
    }

    if (error instanceof GoogleApiError) {
      throw new AnimeImageError(
        translateGoogleDriveImageError(error),
        error.status,
      );
    }

    throw new AnimeImageError("讀取動畫參考圖失敗。", 500);
  }
}

function translateGoogleDriveImageError(error: GoogleApiError): string {
  if (error.status === 401) {
    return "Google 連線已失效，請重新連接。";
  }

  if (error.status === 403) {
    return "Drive 權限不足，無法讀取動畫圖。";
  }

  if (error.status === 404) {
    return "找不到 Drive 動畫圖檔案。";
  }

  return "讀取 Google Drive 動畫圖失敗。";
}
