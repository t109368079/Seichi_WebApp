import { randomUUID } from "node:crypto";
import type { ScenePhotoItem } from "@/application/scene-photo";
import { assertSceneStatus, type SceneStatus } from "@/domain/scene";
import {
  assertUploadablePhoto,
  getNextTakeNumber,
  isAllowedPhotoMimeType,
  resolveStatusAfterPhotoRemoval,
  resolveStatusAfterUpload,
  type PhotoMimeType,
} from "@/domain/scene-photo";
import { assertSceneStatusTransition } from "@/domain/scene-status";
import { prisma } from "@/infrastructure/database/prisma";
import { getPhotoStorage } from "@/infrastructure/storage/local-photo-storage";
import type { StoredPhotoDescriptor } from "@/infrastructure/storage/photo-storage";

export interface UploadScenePhotoInput {
  sceneId: string;
  tripId?: string;
  tripDayId?: string;
  fileName: string;
  mimeType: string;
  capturedAt?: Date;
  bytes: Uint8Array;
}

export interface UploadScenePhotoResult {
  photo: ScenePhotoItem;
  previousStatus: SceneStatus;
  status: SceneStatus;
}

export interface DeleteScenePhotoResult {
  sceneId: string;
  removedTakeNumber: number;
  remainingTakes: number;
  previousStatus: SceneStatus;
  status: SceneStatus;
}

export async function listScenePhotos(
  sceneId: string,
): Promise<ScenePhotoItem[]> {
  const photos = await prisma.scenePhoto.findMany({
    where: { sceneId },
    orderBy: [{ takeNumber: "asc" }],
  });

  return photos.map(mapScenePhotoItem);
}

export async function readScenePhotoBytes(photoId: string): Promise<{
  bytes: Uint8Array;
  mimeType: PhotoMimeType;
  fileName: string;
} | null> {
  const photo = await prisma.scenePhoto.findUnique({ where: { id: photoId } });

  if (!photo) {
    return null;
  }

  const descriptor = toStorageDescriptor(photo.storageFileId, photo.mimeType);
  const stored = await getPhotoStorage().read(descriptor);

  return {
    bytes: stored.bytes,
    mimeType: stored.mimeType,
    fileName: photo.fileName,
  };
}

/**
 * Writes the file inside the database transaction so a storage failure rolls
 * the row back. If a later step fails after the bytes landed, the catch removes
 * the orphaned file, because the transaction cannot undo a filesystem write.
 */
export async function uploadScenePhoto(
  input: UploadScenePhotoInput,
): Promise<UploadScenePhotoResult> {
  const mimeType = assertUploadablePhoto({
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.bytes.byteLength,
  });
  const storage = getPhotoStorage();
  const descriptor: StoredPhotoDescriptor = {
    storageFileId: randomUUID(),
    mimeType,
  };
  let storedBytes = false;

  try {
    return await prisma.$transaction(async (transaction) => {
      const scene = await transaction.scene.findUnique({
        where: { id: input.sceneId },
        select: { id: true, status: true },
      });

      if (!scene) {
        throw new Error("Scene does not exist.");
      }

      if (input.tripDayId) {
        const tripDay = await transaction.tripDay.findUnique({
          where: { id: input.tripDayId },
          select: { id: true, tripId: true },
        });

        if (!tripDay) {
          throw new Error("Trip day does not exist.");
        }
      }

      const existingTakes = await transaction.scenePhoto.findMany({
        where: { sceneId: input.sceneId },
        select: { takeNumber: true },
      });
      const takeNumber = getNextTakeNumber(existingTakes);

      const created = await transaction.scenePhoto.create({
        data: {
          sceneId: input.sceneId,
          tripId: input.tripId ?? null,
          tripDayId: input.tripDayId ?? null,
          fileName: input.fileName,
          mimeType,
          fileSize: input.bytes.byteLength,
          storageFileId: descriptor.storageFileId,
          capturedAt: input.capturedAt ?? null,
          takeNumber,
        },
      });

      await storage.save({ ...descriptor, bytes: input.bytes });
      storedBytes = true;

      const previousStatus = assertSceneStatus(scene.status);
      const nextStatus = resolveStatusAfterUpload(previousStatus);

      if (nextStatus !== previousStatus) {
        assertSceneStatusTransition(previousStatus, nextStatus);
        await transaction.scene.update({
          where: { id: input.sceneId },
          data: { status: nextStatus },
        });
      }

      return {
        photo: mapScenePhotoItem(created),
        previousStatus,
        status: nextStatus,
      };
    });
  } catch (error) {
    if (storedBytes) {
      await storage.delete(descriptor).catch(() => undefined);
    }

    throw error;
  }
}

/**
 * Removes one take without touching the others. The stored file is deleted only
 * after the row is gone, so a storage failure cannot leave a row pointing at
 * bytes that no longer exist.
 */
export async function deleteScenePhoto(
  photoId: string,
): Promise<DeleteScenePhotoResult> {
  const outcome = await prisma.$transaction(async (transaction) => {
    const photo = await transaction.scenePhoto.findUnique({
      where: { id: photoId },
      include: {
        scene: {
          select: { id: true, status: true },
        },
      },
    });

    if (!photo) {
      throw new Error("Scene photo does not exist.");
    }

    await transaction.scenePhoto.delete({ where: { id: photoId } });

    const remainingTakes = await transaction.scenePhoto.count({
      where: { sceneId: photo.sceneId },
    });
    const remainingBestTakes = await transaction.scenePhoto.count({
      where: { sceneId: photo.sceneId, isBest: true },
    });
    const previousStatus = assertSceneStatus(photo.scene.status);
    const nextStatus = resolveStatusAfterPhotoRemoval(
      previousStatus,
      remainingTakes,
      photo.isBest,
      remainingBestTakes,
    );

    if (nextStatus !== previousStatus) {
      assertSceneStatusTransition(previousStatus, nextStatus);
      await transaction.scene.update({
        where: { id: photo.sceneId },
        data: { status: nextStatus },
      });
    }

    return {
      descriptor: toStorageDescriptor(photo.storageFileId, photo.mimeType),
      result: {
        sceneId: photo.sceneId,
        removedTakeNumber: photo.takeNumber,
        remainingTakes,
        previousStatus,
        status: nextStatus,
      },
    };
  });

  await getPhotoStorage().delete(outcome.descriptor);

  return outcome.result;
}

function toStorageDescriptor(
  storageFileId: string,
  mimeType: string,
): StoredPhotoDescriptor {
  if (!isAllowedPhotoMimeType(mimeType)) {
    throw new Error(`Unsupported stored photo type: ${mimeType}`);
  }

  return { storageFileId, mimeType };
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
