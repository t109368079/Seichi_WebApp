import {
  type GoogleDriveFileMetadata,
  downloadGoogleDriveFile,
  getGoogleDriveFileMetadata,
} from "@/infrastructure/google/google-drive";
import { parseGoogleDriveFileReference } from "@/application/scene-import";
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

interface ResolvedAnimeImageReference {
  metadata: GoogleDriveFileMetadata;
  driveFileId: string;
  resourceKey?: string;
}

const googleDriveShortcutMimeType = "application/vnd.google-apps.shortcut";

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
    const driveReference = parseGoogleDriveFileReference(
      scene.animeImageDriveFileId,
    );
    const imageReference = await resolveAnimeImageReference(
      driveReference.fileId,
      accessToken,
      driveReference.resourceKey,
    );

    if (!imageReference.metadata.mimeType.startsWith("image/")) {
      throw new AnimeImageError("Drive 檔案不是圖片。", 415);
    }

    const downloaded = await downloadGoogleDriveFile(
      imageReference.driveFileId,
      accessToken,
      imageReference.resourceKey,
    );

    return {
      bytes: downloaded.bytes,
      mimeType: imageReference.metadata.mimeType,
      fileName: imageReference.metadata.name,
      sceneCode: scene.sceneCode,
      driveFileId: imageReference.driveFileId,
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

async function resolveAnimeImageReference(
  driveFileId: string,
  accessToken: string,
  resourceKey?: string,
): Promise<ResolvedAnimeImageReference> {
  const metadata = await getGoogleDriveFileMetadata(
    driveFileId,
    accessToken,
    resourceKey,
  );

  if (metadata.mimeType !== googleDriveShortcutMimeType) {
    return {
      metadata,
      driveFileId,
      resourceKey: metadata.resourceKey ?? resourceKey,
    };
  }

  const shortcutDetails = metadata.shortcutDetails;
  const targetId = shortcutDetails?.targetId;

  if (!targetId) {
    throw new AnimeImageError("Drive 捷徑缺少目標檔案。", 404);
  }

  const targetResourceKey = shortcutDetails.targetResourceKey;
  const targetMetadata = await getGoogleDriveFileMetadata(
    targetId,
    accessToken,
    targetResourceKey,
  );

  return {
    metadata: targetMetadata,
    driveFileId: targetId,
    resourceKey: targetMetadata.resourceKey ?? targetResourceKey,
  };
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
