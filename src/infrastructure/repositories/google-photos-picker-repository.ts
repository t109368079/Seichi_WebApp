import { isAllowedPhotoMimeType } from "@/domain/scene-photo";
import {
  createGooglePhotosPickerSession,
  deleteGooglePhotosPickerSession,
  downloadGooglePhotosPickedImage,
  getGooglePhotosPickerSession,
  listGooglePhotosPickedMediaItems,
  type GooglePhotosPickedMediaItem,
  type GooglePhotosPickerSession,
} from "@/infrastructure/google/google-photos-picker";
import {
  getGoogleAccessTokenForSession,
  GoogleSessionError,
} from "@/infrastructure/repositories/google-integration-repository";
import {
  uploadScenePhoto,
  type UploadScenePhotoResult,
} from "@/infrastructure/repositories/scene-photo-repository";
import { isGoogleDrivePhotoStorageEnabled } from "@/infrastructure/storage/local-photo-storage";

export interface GooglePhotosPickerSessionView {
  sessionId: string;
  pickerUri: string;
  mediaItemsSet: boolean;
  pollIntervalMs: number;
  timeoutMs: number;
  expireTime?: string;
}

export interface GooglePhotosPickedMediaItemView {
  id: string;
  fileName: string;
  mimeType: string;
  type?: string;
  createTime?: string;
}

export interface GooglePhotosPickerSessionStatusView extends GooglePhotosPickerSessionView {
  mediaItems: GooglePhotosPickedMediaItemView[];
}

export interface ImportGooglePhotosPickedMediaItemInput {
  googleSessionToken: string;
  sceneId: string;
  tripId?: string;
  tripDayId?: string;
  pickerSessionId: string;
  mediaItemId?: string;
}

export class GooglePhotosImportError extends Error {
  constructor(
    message: string,
    readonly code:
      | "storage_backend"
      | "google_session"
      | "not_ready"
      | "not_found"
      | "unsupported_type"
      | "invalid_request",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "GooglePhotosImportError";
  }
}

export async function createGooglePhotosPickerSessionForAccount(
  googleSessionToken?: string,
): Promise<GooglePhotosPickerSessionView> {
  const accessToken = await getAccessToken(googleSessionToken);
  const session = await createGooglePhotosPickerSession({
    accessToken,
    maxItemCount: 1,
  });

  return mapPickerSessionView(session);
}

export async function getGooglePhotosPickerSessionForAccount(
  googleSessionToken: string | undefined,
  sessionId: string,
): Promise<GooglePhotosPickerSessionStatusView> {
  const accessToken = await getAccessToken(googleSessionToken);
  const session = await getGooglePhotosPickerSession(sessionId, accessToken);
  const mediaItems = session.mediaItemsSet
    ? await listGooglePhotosPickedMediaItems(sessionId, accessToken)
    : [];

  return {
    ...mapPickerSessionView(session),
    mediaItems: mediaItems.map(mapPickedMediaItemView),
  };
}

export async function deleteGooglePhotosPickerSessionForAccount(
  googleSessionToken: string | undefined,
  sessionId: string,
): Promise<void> {
  const accessToken = await getAccessToken(googleSessionToken);

  await deleteGooglePhotosPickerSession(sessionId, accessToken);
}

export async function importGooglePhotosPickedMediaItem(
  input: ImportGooglePhotosPickedMediaItemInput,
): Promise<UploadScenePhotoResult> {
  if (!isGoogleDrivePhotoStorageEnabled()) {
    throw new GooglePhotosImportError(
      "Google Photos import requires Google Drive photo storage.",
      "storage_backend",
    );
  }

  const accessToken = await getAccessToken(input.googleSessionToken);
  const mediaItems = await listGooglePhotosPickedMediaItems(
    input.pickerSessionId,
    accessToken,
  );
  const mediaItem = selectPickedMediaItem(mediaItems, input.mediaItemId);

  assertSupportedPickedPhoto(mediaItem);

  const downloaded = await downloadGooglePhotosPickedImage(
    mediaItem,
    accessToken,
  );

  try {
    const result = await uploadScenePhoto({
      sceneId: input.sceneId,
      tripId: input.tripId,
      tripDayId: input.tripDayId,
      fileName: downloaded.fileName,
      mimeType: downloaded.mimeType,
      capturedAt: downloaded.capturedAt,
      bytes: downloaded.bytes,
      googleSessionToken: input.googleSessionToken,
    });

    await deleteGooglePhotosPickerSession(input.pickerSessionId, accessToken);

    return result;
  } catch (error) {
    if (error instanceof GooglePhotosImportError) {
      throw error;
    }

    throw error;
  }
}

function selectPickedMediaItem(
  mediaItems: readonly GooglePhotosPickedMediaItem[],
  mediaItemId?: string,
): GooglePhotosPickedMediaItem {
  if (mediaItems.length === 0) {
    throw new GooglePhotosImportError(
      "Google Photos Picker session has no selected media items.",
      "not_ready",
    );
  }

  if (!mediaItemId) {
    return mediaItems[0] as GooglePhotosPickedMediaItem;
  }

  const selected = mediaItems.find((item) => item.id === mediaItemId);

  if (!selected) {
    throw new GooglePhotosImportError(
      "Selected Google Photos media item was not found in this session.",
      "not_found",
    );
  }

  return selected;
}

function assertSupportedPickedPhoto(
  mediaItem: GooglePhotosPickedMediaItem,
): void {
  const mimeType = mediaItem.mediaFile?.mimeType ?? "";

  if (mediaItem.type && mediaItem.type !== "PHOTO") {
    throw new GooglePhotosImportError(
      "Only Google Photos image items can be imported.",
      "unsupported_type",
    );
  }

  if (!isAllowedPhotoMimeType(mimeType)) {
    throw new GooglePhotosImportError(
      `Unsupported Google Photos media type: ${mimeType}`,
      "unsupported_type",
    );
  }
}

async function getAccessToken(
  googleSessionToken: string | undefined,
): Promise<string> {
  if (!googleSessionToken) {
    throw new GooglePhotosImportError(
      "Google session is required for Google Photos import.",
      "google_session",
    );
  }

  try {
    return await getGoogleAccessTokenForSession(googleSessionToken);
  } catch (error) {
    if (error instanceof GoogleSessionError) {
      throw new GooglePhotosImportError(error.message, "google_session", {
        cause: error,
      });
    }

    throw error;
  }
}

function mapPickerSessionView(
  session: GooglePhotosPickerSession,
): GooglePhotosPickerSessionView {
  return {
    sessionId: session.id,
    pickerUri: session.pickerUri,
    mediaItemsSet: session.mediaItemsSet === true,
    pollIntervalMs: parseDurationMs(session.pollingConfig?.pollInterval, 3000),
    timeoutMs: parseDurationMs(session.pollingConfig?.timeoutIn, 180000),
    expireTime: session.expireTime,
  };
}

function mapPickedMediaItemView(
  mediaItem: GooglePhotosPickedMediaItem,
): GooglePhotosPickedMediaItemView {
  return {
    id: mediaItem.id,
    fileName: mediaItem.mediaFile?.filename ?? mediaItem.id,
    mimeType: mediaItem.mediaFile?.mimeType ?? "",
    type: mediaItem.type,
    createTime: mediaItem.createTime,
  };
}

function parseDurationMs(value: string | undefined, fallback: number): number {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)s$/);

  if (!match) {
    return fallback;
  }

  return Math.max(0, Math.round(Number(match[1]) * 1000));
}
