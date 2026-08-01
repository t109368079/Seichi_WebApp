import { assertSceneStatus, type SceneStatus } from "@/domain/scene";
import { assertSceneStatusTransition } from "@/domain/scene-status";

export const reviewBuckets = [
  "PENDING_REVIEW",
  "RETAKE_REQUIRED",
  "NOT_SHOT",
  "MISSING_BEST",
  "REVIEWED",
] as const;

export type ReviewBucket = (typeof reviewBuckets)[number];

export const reviewStatusActions = [
  "MARK_REVIEWED",
  "MARK_RETAKE_REQUIRED",
  "MARK_PENDING_REVIEW",
] as const;

export type ReviewStatusAction = (typeof reviewStatusActions)[number];

export interface ReviewPhotoState {
  id: string;
  isBest: boolean;
}

export interface ReviewSceneState {
  status: SceneStatus;
  photos: readonly ReviewPhotoState[];
}

const reviewActionTargets = {
  MARK_REVIEWED: "REVIEWED",
  MARK_RETAKE_REQUIRED: "RETAKE_REQUIRED",
  MARK_PENDING_REVIEW: "PENDING_REVIEW",
} satisfies Record<ReviewStatusAction, SceneStatus>;

export function isReviewBucket(value: string): value is ReviewBucket {
  return reviewBuckets.includes(value as ReviewBucket);
}

export function isReviewStatusAction(
  value: string,
): value is ReviewStatusAction {
  return reviewStatusActions.includes(value as ReviewStatusAction);
}

export function assertReviewStatusAction(value: string): ReviewStatusAction {
  if (!isReviewStatusAction(value)) {
    throw new Error(`Invalid ReviewStatusAction: ${value}`);
  }

  return value;
}

export function resolveReviewStatusTarget(
  action: ReviewStatusAction,
): SceneStatus {
  return reviewActionTargets[action];
}

export function hasBestPhoto(
  photos: readonly Pick<ReviewPhotoState, "isBest">[],
): boolean {
  return photos.some((photo) => photo.isBest);
}

export function countBestPhotos(
  photos: readonly Pick<ReviewPhotoState, "isBest">[],
): number {
  return photos.filter((photo) => photo.isBest).length;
}

export function assertBestPhotoUniqueness(
  photos: readonly Pick<ReviewPhotoState, "isBest">[],
): void {
  const bestCount = countBestPhotos(photos);

  if (bestCount > 1) {
    throw new Error("A Scene can have at most one best photo.");
  }
}

export function assertPhotoCanBeSelectedAsBest(
  photos: readonly ReviewPhotoState[],
  photoId: string,
): void {
  if (!photos.some((photo) => photo.id === photoId)) {
    throw new Error("Scene photo does not belong to this Scene.");
  }
}

export function applyBestPhotoSelection<T extends ReviewPhotoState>(
  photos: readonly T[],
  photoId: string,
): (T & ReviewPhotoState)[] {
  assertPhotoCanBeSelectedAsBest(photos, photoId);

  return photos.map((photo) => ({
    ...photo,
    isBest: photo.id === photoId,
  }));
}

export function canMarkSceneReviewed(state: ReviewSceneState): boolean {
  return (
    assertSceneStatus(state.status) === "PENDING_REVIEW" &&
    state.photos.length > 0 &&
    hasBestPhoto(state.photos)
  );
}

export function assertSceneCanBeMarkedReviewed(state: ReviewSceneState): void {
  if (state.photos.length === 0) {
    throw new Error("Cannot mark a Scene REVIEWED without photos.");
  }

  if (!hasBestPhoto(state.photos)) {
    throw new Error("Cannot mark a Scene REVIEWED without a best photo.");
  }

  assertSceneStatusTransition(assertSceneStatus(state.status), "REVIEWED");
}

export function assertReviewStatusTransition(
  state: ReviewSceneState,
  action: ReviewStatusAction,
): SceneStatus {
  const current = assertSceneStatus(state.status);
  const target = resolveReviewStatusTarget(action);

  if (target === "REVIEWED") {
    assertSceneCanBeMarkedReviewed(state);

    return target;
  }

  return assertSceneStatusTransition(current, target);
}

export function matchesReviewBucket(
  input: {
    status: SceneStatus;
    photoCount: number;
    hasBestPhoto: boolean;
  },
  bucket: ReviewBucket,
): boolean {
  if (bucket === "MISSING_BEST") {
    return input.photoCount > 0 && !input.hasBestPhoto;
  }

  return input.status === bucket;
}
