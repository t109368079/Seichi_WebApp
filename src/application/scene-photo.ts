import {
  allowedPhotoMimeTypes,
  maxPhotoFileSizeBytes,
  type PhotoMimeType,
} from "@/domain/scene-photo";

export interface ScenePhotoItem {
  id: string;
  sceneId: string;
  fileName: string;
  mimeType: PhotoMimeType;
  fileSize: number;
  takeNumber: number;
  isBest: boolean;
  capturedAt?: string;
  uploadedAt: string;
  tripId?: string;
  tripDayId?: string;
}

export interface ScenePhotoSummary {
  totalTakes: number;
  latestTakeNumber: number;
  hasPhotos: boolean;
}

export function getScenePhotoHref(photoId: string): string {
  return `/api/scene-photos/${photoId}`;
}

export function getTakeLabel(takeNumber: number): string {
  return `Take ${takeNumber}`;
}

export function summarizeScenePhotos(
  photos: readonly ScenePhotoItem[],
): ScenePhotoSummary {
  return {
    totalTakes: photos.length,
    latestTakeNumber: photos.reduce(
      (highest, photo) => Math.max(highest, photo.takeNumber),
      0,
    ),
    hasPhotos: photos.length > 0,
  };
}

export function getPhotoAcceptAttribute(): string {
  return allowedPhotoMimeTypes.join(",");
}

export function formatPhotoFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMaxPhotoFileSizeLabel(): string {
  return formatPhotoFileSize(maxPhotoFileSizeBytes);
}

export function getPhotoUploadEndpoint(): string {
  return "/api/scene-photos";
}

export function getGooglePhotosPickerSessionsEndpoint(): string {
  return "/api/google-photos-picker/sessions";
}

export function getGooglePhotosPickerSessionEndpoint(
  sessionId: string,
): string {
  return `/api/google-photos-picker/sessions/${encodeURIComponent(sessionId)}`;
}

export function getGooglePhotosImportEndpoint(): string {
  return "/api/scene-photos/google-photos";
}

export function getFieldUploadHref(
  tripDayId: string,
  tripSceneId: string,
): string {
  return `/field/${tripDayId}/${tripSceneId}/upload`;
}
