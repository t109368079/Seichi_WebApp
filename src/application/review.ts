import {
  getSceneStatusLabel,
  type SceneCatalogItem,
} from "@/application/scene-catalog";
import {
  getScenePhotoHref,
  type ScenePhotoItem,
} from "@/application/scene-photo";
import { isSceneStatus, type SceneStatus } from "@/domain/scene";
import {
  hasBestPhoto,
  isReviewBucket,
  matchesReviewBucket,
  reviewBuckets,
  type ReviewBucket,
  type ReviewStatusAction,
} from "@/domain/review";

export interface ReviewQueueFilters {
  bucket?: ReviewBucket;
  workId?: string;
  locationId?: string;
  tripId?: string;
  status?: SceneStatus;
}

export interface ReviewQueueItem {
  scene: SceneCatalogItem;
  photos: ScenePhotoItem[];
  photoCount: number;
  hasBestPhoto: boolean;
  bestPhoto?: ScenePhotoItem;
  tripIds: string[];
  tripNames: string[];
}

export interface ReviewQueueSummary {
  totalScenes: number;
  pendingReview: number;
  retakeRequired: number;
  notShot: number;
  missingBest: number;
  reviewed: number;
}

export interface ReviewSceneDetail {
  scene: SceneCatalogItem;
  photos: ScenePhotoItem[];
  selectedPhoto?: ScenePhotoItem;
  bestPhoto?: ScenePhotoItem;
}

export function readReviewQueueFilters(
  params: Record<string, string | string[] | undefined>,
): ReviewQueueFilters {
  const bucket = first(params.bucket);
  const status = first(params.status);

  return {
    bucket: bucket && isReviewBucket(bucket) ? bucket : undefined,
    workId: first(params.workId) || undefined,
    locationId: first(params.locationId) || undefined,
    tripId: first(params.tripId) || undefined,
    status: status && isSceneStatus(status) ? status : undefined,
  };
}

export function filterReviewQueueItems(
  items: readonly ReviewQueueItem[],
  filters: ReviewQueueFilters,
): ReviewQueueItem[] {
  return items.filter((item) => {
    if (filters.workId && item.scene.work.id !== filters.workId) {
      return false;
    }

    if (filters.locationId && item.scene.location.id !== filters.locationId) {
      return false;
    }

    if (filters.status && item.scene.status !== filters.status) {
      return false;
    }

    if (filters.tripId && !item.tripIds.includes(filters.tripId)) {
      return false;
    }

    if (
      filters.bucket &&
      !matchesReviewBucket(
        {
          status: item.scene.status,
          photoCount: item.photoCount,
          hasBestPhoto: item.hasBestPhoto,
        },
        filters.bucket,
      )
    ) {
      return false;
    }

    return true;
  });
}

export function summarizeReviewQueue(
  items: readonly ReviewQueueItem[],
): ReviewQueueSummary {
  return {
    totalScenes: items.length,
    pendingReview: countByBucket(items, "PENDING_REVIEW"),
    retakeRequired: countByBucket(items, "RETAKE_REQUIRED"),
    notShot: countByBucket(items, "NOT_SHOT"),
    missingBest: countByBucket(items, "MISSING_BEST"),
    reviewed: countByBucket(items, "REVIEWED"),
  };
}

export function chooseSelectedReviewPhoto(
  photos: readonly ScenePhotoItem[],
  selectedPhotoId?: string,
): ScenePhotoItem | undefined {
  if (selectedPhotoId) {
    const selected = photos.find((photo) => photo.id === selectedPhotoId);

    if (selected) {
      return selected;
    }
  }

  return photos.find((photo) => photo.isBest) ?? photos[0];
}

export function canReviewSceneBeCompleted(
  detail: Pick<ReviewSceneDetail, "scene" | "photos">,
): boolean {
  return (
    detail.scene.status === "PENDING_REVIEW" && hasBestPhoto(detail.photos)
  );
}

export function getReviewBucketLabel(bucket: ReviewBucket): string {
  const labels = {
    PENDING_REVIEW: "待確認",
    RETAKE_REQUIRED: "需要補拍",
    NOT_SHOT: "未拍攝",
    MISSING_BEST: "有照片但未選最佳照片",
    REVIEWED: "已審核",
  } satisfies Record<ReviewBucket, string>;

  return labels[bucket];
}

export function getReviewBucketOptions(): readonly ReviewBucket[] {
  return reviewBuckets;
}

export function getReviewStatusActionLabel(action: ReviewStatusAction): string {
  const labels = {
    MARK_REVIEWED: "標記已審核",
    MARK_RETAKE_REQUIRED: "標記需要補拍",
    MARK_PENDING_REVIEW: "返回待確認",
  } satisfies Record<ReviewStatusAction, string>;

  return labels[action];
}

export function getReviewStatusHelper(
  detail: Pick<ReviewSceneDetail, "scene" | "photos">,
): string {
  if (detail.scene.status === "REVIEWED") {
    return "此場景已完成審核。";
  }

  if (detail.photos.length === 0) {
    return "沒有實景照片時不可標記已審核。";
  }

  if (!hasBestPhoto(detail.photos)) {
    return "請先選擇最佳照片，再標記已審核。";
  }

  return "最佳照片已選定，可以完成審核。";
}

export function getReviewPhotoHref(photoId: string): string {
  return getScenePhotoHref(photoId);
}

export function getReviewSceneHref(sceneId: string, photoId?: string): string {
  const params = new URLSearchParams();

  if (photoId) {
    params.set("photoId", photoId);
  }

  const query = params.toString();

  return query ? `/reviews/${sceneId}?${query}` : `/reviews/${sceneId}`;
}

export function getSceneStatusReviewLabel(status: SceneStatus): string {
  return getSceneStatusLabel(status);
}

function countByBucket(
  items: readonly ReviewQueueItem[],
  bucket: ReviewBucket,
): number {
  return items.filter((item) =>
    matchesReviewBucket(
      {
        status: item.scene.status,
        photoCount: item.photoCount,
        hasBestPhoto: item.hasBestPhoto,
      },
      bucket,
    ),
  ).length;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
