import {
  chooseSelectedReviewPhoto,
  filterReviewQueueItems,
  summarizeReviewQueue,
  type ReviewQueueFilters,
  type ReviewQueueItem,
  type ReviewQueueSummary,
  type ReviewSceneDetail,
} from "@/application/review";
import type { SceneCatalogItem } from "@/application/scene-catalog";
import type { ScenePhotoItem } from "@/application/scene-photo";
import { assertSceneStatus } from "@/domain/scene";
import { isAllowedPhotoMimeType } from "@/domain/scene-photo";
import {
  assertBestPhotoUniqueness,
  assertPhotoCanBeSelectedAsBest,
  assertReviewStatusTransition,
  type ReviewStatusAction,
} from "@/domain/review";
import { prisma } from "@/infrastructure/database/prisma";

export interface ReviewQueueData {
  items: ReviewQueueItem[];
  totalSceneCount: number;
  summary: ReviewQueueSummary;
  works: {
    id: string;
    name: string;
    shortCode: string;
  }[];
  locations: {
    id: string;
    name: string;
    areaName: string | undefined;
  }[];
  trips: {
    id: string;
    name: string;
  }[];
}

export interface BestPhotoSelectionResult {
  sceneId: string;
  photoId: string;
}

export interface ReviewStatusUpdateResult {
  sceneId: string;
  previousStatus: string;
  status: string;
}

export async function getReviewQueueData(
  filters: ReviewQueueFilters,
): Promise<ReviewQueueData> {
  const [scenes, works, locations, trips] = await Promise.all([
    prisma.scene.findMany({
      where: {
        workId: filters.workId,
        locationId: filters.locationId,
        status: filters.status,
        tripScenes: filters.tripId
          ? {
              some: {
                tripDay: {
                  tripId: filters.tripId,
                },
              },
            }
          : undefined,
      },
      include: {
        work: true,
        location: true,
        photos: {
          orderBy: [{ takeNumber: "asc" }],
        },
        tripScenes: {
          include: {
            tripDay: {
              include: {
                trip: true,
              },
            },
          },
        },
      },
      orderBy: [{ location: { areaName: "asc" } }, { sceneCode: "asc" }],
    }),
    prisma.work.findMany({ orderBy: { shortCode: "asc" } }),
    prisma.location.findMany({
      orderBy: [{ areaName: "asc" }, { name: "asc" }],
    }),
    prisma.trip.findMany({ orderBy: [{ startDate: "desc" }, { name: "asc" }] }),
  ]);

  const baseItems = scenes.map(mapReviewQueueItem);
  const items = filters.bucket
    ? filterReviewQueueItems(baseItems, { bucket: filters.bucket })
    : baseItems;

  return {
    items,
    totalSceneCount: baseItems.length,
    summary: summarizeReviewQueue(baseItems),
    works,
    locations: locations.map((location) => ({
      id: location.id,
      name: location.name,
      areaName: location.areaName ?? undefined,
    })),
    trips: trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
    })),
  };
}

export async function getReviewSceneDetail(
  sceneId: string,
  selectedPhotoId?: string,
): Promise<ReviewSceneDetail | null> {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: {
      work: true,
      location: true,
      photos: {
        orderBy: [{ takeNumber: "asc" }],
      },
    },
  });

  if (!scene) {
    return null;
  }

  const photos = scene.photos.map(mapScenePhotoItem);
  const bestPhoto = photos.find((photo) => photo.isBest);

  return {
    scene: mapSceneCatalogItem(scene),
    photos,
    bestPhoto,
    selectedPhoto: chooseSelectedReviewPhoto(photos, selectedPhotoId),
  };
}

export async function selectBestScenePhoto(
  photoId: string,
): Promise<BestPhotoSelectionResult> {
  return await prisma.$transaction(async (transaction) => {
    const photo = await transaction.scenePhoto.findUnique({
      where: { id: photoId },
      select: { id: true, sceneId: true },
    });

    if (!photo) {
      throw new Error("Scene photo does not exist.");
    }

    const photos = await transaction.scenePhoto.findMany({
      where: { sceneId: photo.sceneId },
      select: { id: true, isBest: true },
    });

    assertPhotoCanBeSelectedAsBest(photos, photoId);

    await transaction.scenePhoto.updateMany({
      where: { sceneId: photo.sceneId },
      data: { isBest: false },
    });
    await transaction.scenePhoto.update({
      where: { id: photoId },
      data: { isBest: true },
    });

    return {
      sceneId: photo.sceneId,
      photoId,
    };
  });
}

export async function updateSceneReviewStatus(
  sceneId: string,
  action: ReviewStatusAction,
): Promise<ReviewStatusUpdateResult> {
  return await prisma.$transaction(async (transaction) => {
    const scene = await transaction.scene.findUnique({
      where: { id: sceneId },
      select: {
        id: true,
        status: true,
        photos: {
          select: { id: true, isBest: true },
        },
      },
    });

    if (!scene) {
      throw new Error("Scene does not exist.");
    }

    assertBestPhotoUniqueness(scene.photos);
    const previousStatus = assertSceneStatus(scene.status);
    const nextStatus = assertReviewStatusTransition(
      {
        status: previousStatus,
        photos: scene.photos,
      },
      action,
    );

    await transaction.scene.update({
      where: { id: sceneId },
      data: { status: nextStatus },
    });

    return {
      sceneId,
      previousStatus,
      status: nextStatus,
    };
  });
}

function mapReviewQueueItem(scene: {
  id: string;
  sceneCode: string;
  episode: string | null;
  animeImageDriveFileId: string;
  latitude: number;
  longitude: number;
  mapsUrl: string | null;
  notes: string | null;
  status: string;
  work: {
    id: string;
    name: string;
    shortCode: string;
  };
  location: {
    id: string;
    name: string;
    areaName: string | null;
  };
  photos: Parameters<typeof mapScenePhotoItem>[0][];
  tripScenes: {
    tripDay: {
      trip: {
        id: string;
        name: string;
      };
    };
  }[];
}): ReviewQueueItem {
  const photos = scene.photos.map(mapScenePhotoItem);
  const bestPhoto = photos.find((photo) => photo.isBest);
  const tripIds = [
    ...new Set(scene.tripScenes.map((item) => item.tripDay.trip.id)),
  ].sort((first, second) => first.localeCompare(second));
  const tripNames = [
    ...new Set(scene.tripScenes.map((item) => item.tripDay.trip.name)),
  ].sort((first, second) => first.localeCompare(second));

  return {
    scene: mapSceneCatalogItem(scene),
    photos,
    photoCount: photos.length,
    hasBestPhoto: Boolean(bestPhoto),
    bestPhoto,
    tripIds,
    tripNames,
  };
}

function mapSceneCatalogItem(scene: {
  id: string;
  sceneCode: string;
  episode: string | null;
  animeImageDriveFileId: string;
  latitude: number;
  longitude: number;
  mapsUrl: string | null;
  notes: string | null;
  status: string;
  work: {
    id: string;
    name: string;
    shortCode: string;
  };
  location: {
    id: string;
    name: string;
    areaName: string | null;
  };
}): SceneCatalogItem {
  return {
    id: scene.id,
    sceneCode: scene.sceneCode,
    episode: scene.episode ?? undefined,
    animeImageDriveFileId: scene.animeImageDriveFileId,
    latitude: scene.latitude,
    longitude: scene.longitude,
    mapsUrl: scene.mapsUrl ?? undefined,
    notes: scene.notes ?? undefined,
    status: assertSceneStatus(scene.status),
    work: {
      id: scene.work.id,
      name: scene.work.name,
      shortCode: scene.work.shortCode,
    },
    location: {
      id: scene.location.id,
      name: scene.location.name,
      areaName: scene.location.areaName ?? undefined,
    },
  };
}

function mapScenePhotoItem(photo: {
  id: string;
  sceneId: string;
  tripId: string | null;
  tripDayId: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  capturedAt: Date | null;
  uploadedAt: Date;
  takeNumber: number;
  isBest: boolean;
}): ScenePhotoItem {
  if (!isAllowedPhotoMimeType(photo.mimeType)) {
    throw new Error(`Unsupported stored photo type: ${photo.mimeType}`);
  }

  return {
    id: photo.id,
    sceneId: photo.sceneId,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    fileSize: photo.fileSize,
    takeNumber: photo.takeNumber,
    isBest: photo.isBest,
    capturedAt: photo.capturedAt?.toISOString(),
    uploadedAt: photo.uploadedAt.toISOString(),
    tripId: photo.tripId ?? undefined,
    tripDayId: photo.tripDayId ?? undefined,
  };
}
