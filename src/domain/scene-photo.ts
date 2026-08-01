import type { SceneStatus } from "@/domain/scene";
import { canTransitionSceneStatus } from "@/domain/scene-status";

export const allowedPhotoMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoMimeType = (typeof allowedPhotoMimeTypes)[number];

export const maxPhotoFileSizeBytes = 15 * 1024 * 1024;

const photoFileExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<PhotoMimeType, string>;

export interface ScenePhotoUploadCandidate {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface TakeNumbered {
  takeNumber: number;
}

export function isAllowedPhotoMimeType(value: string): value is PhotoMimeType {
  return allowedPhotoMimeTypes.includes(value as PhotoMimeType);
}

export function getPhotoFileExtension(mimeType: PhotoMimeType): string {
  return photoFileExtensions[mimeType];
}

export function assertUploadablePhoto(
  candidate: ScenePhotoUploadCandidate,
): PhotoMimeType {
  if (candidate.fileName.trim().length === 0) {
    throw new Error("Photo fileName is required.");
  }

  if (!isAllowedPhotoMimeType(candidate.mimeType)) {
    throw new Error(`Unsupported photo type: ${candidate.mimeType}`);
  }

  if (!Number.isFinite(candidate.fileSize) || candidate.fileSize <= 0) {
    throw new Error("Photo file is empty.");
  }

  if (candidate.fileSize > maxPhotoFileSizeBytes) {
    throw new Error(
      `Photo exceeds the ${maxPhotoFileSizeBytes} byte upload limit.`,
    );
  }

  return candidate.mimeType;
}

/**
 * Takes are append-only. A new upload always claims one past the current
 * maximum, so deleting take 2 of three leaves the next upload at take 4 and a
 * take number is never reused within a Scene.
 */
export function getNextTakeNumber(existing: readonly TakeNumbered[]): number {
  if (existing.length === 0) {
    return 1;
  }

  return Math.max(...existing.map((photo) => photo.takeNumber)) + 1;
}

export function buildStorageFileName(
  storageFileId: string,
  mimeType: PhotoMimeType,
): string {
  return `${storageFileId}.${getPhotoFileExtension(mimeType)}`;
}

/**
 * Requirements section 8 lists exactly two upload-driven transitions. Any other
 * status is left untouched rather than inventing a rule Phase 7 has not approved.
 */
export function resolveStatusAfterUpload(current: SceneStatus): SceneStatus {
  if (current === "NOT_SHOT" || current === "RETAKE_REQUIRED") {
    return "PENDING_REVIEW";
  }

  return current;
}

/**
 * Keeps status honest about whether real photos and review completion still
 * exist. Phase 7 reopens REVIEWED when its required best photo disappears.
 */
export function resolveStatusAfterPhotoRemoval(
  current: SceneStatus,
  remainingPhotoCount: number,
  removedWasBest = false,
  remainingBestPhotoCount = 0,
): SceneStatus {
  if (remainingPhotoCount > 0) {
    if (
      current === "REVIEWED" &&
      (removedWasBest || remainingBestPhotoCount === 0)
    ) {
      return "PENDING_REVIEW";
    }

    return current;
  }

  if (current === "PENDING_REVIEW" || current === "REVIEWED") {
    return "NOT_SHOT";
  }

  return current;
}

export function isPhotoStatusChangeAllowed(
  from: SceneStatus,
  to: SceneStatus,
): boolean {
  return from === to || canTransitionSceneStatus(from, to);
}
