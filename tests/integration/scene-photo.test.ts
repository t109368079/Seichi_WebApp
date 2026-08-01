import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildStorageFileName } from "@/domain/scene-photo";
import {
  deleteScenePhoto,
  listScenePhotos,
  readScenePhotoBytes,
  uploadScenePhoto,
} from "@/infrastructure/repositories/scene-photo-repository";
import {
  addSceneToTripDay,
  createTrip,
  deleteTrip,
  getTripDetail,
} from "@/infrastructure/repositories/trip-planning-repository";
import {
  getPhotoStorageDirectory,
  setPhotoStorage,
} from "@/infrastructure/storage/local-photo-storage";
import { PhotoStorageError } from "@/infrastructure/storage/photo-storage";
import { prisma } from "@/infrastructure/database/prisma";

/** Smallest valid PNG: a single transparent pixel. */
const pngBytes = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const seededStatuses = {
  "scene-bhc-001": "NOT_SHOT",
  "scene-slc-001": "PENDING_REVIEW",
  "scene-ars-001": "REVIEWED",
  "scene-ars-003": "RETAKE_REQUIRED",
} as const;

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  setPhotoStorage(undefined);

  const photos = await prisma.scenePhoto.findMany();
  for (const photo of photos) {
    await deleteScenePhoto(photo.id).catch(() => undefined);
  }
  await prisma.scenePhoto.deleteMany();

  await prisma.trip.deleteMany({
    where: { name: { startsWith: "Integration" } },
  });

  for (const [sceneId, status] of Object.entries(seededStatuses)) {
    await prisma.scene.update({ where: { id: sceneId }, data: { status } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

function upload(sceneId: string, fileName = "IMG_0001.png", extra = {}) {
  return uploadScenePhoto({
    sceneId,
    fileName,
    mimeType: "image/png",
    bytes: pngBytes,
    ...extra,
  });
}

async function storedFileExists(
  storageFileId: string,
  mimeType: "image/png" = "image/png",
): Promise<boolean> {
  const target = path.resolve(
    getPhotoStorageDirectory(),
    buildStorageFileName(storageFileId, mimeType),
  );

  try {
    await access(target);

    return true;
  } catch {
    return false;
  }
}

async function readStatus(sceneId: string): Promise<string | undefined> {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { status: true },
  });

  return scene?.status;
}

describe("scene photo upload", () => {
  it("stores bytes, binds the photo, and moves NOT_SHOT to PENDING_REVIEW", async () => {
    const result = await upload("scene-bhc-001");

    expect(result.previousStatus).toBe("NOT_SHOT");
    expect(result.status).toBe("PENDING_REVIEW");
    expect(result.photo.takeNumber).toBe(1);
    expect(result.photo.sceneId).toBe("scene-bhc-001");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("PENDING_REVIEW");

    const stored = await readScenePhotoBytes(result.photo.id);
    expect(stored?.mimeType).toBe("image/png");
    expect(Buffer.from(stored?.bytes ?? new Uint8Array())).toEqual(
      Buffer.from(pngBytes),
    );
  });

  it("moves RETAKE_REQUIRED back to PENDING_REVIEW", async () => {
    const result = await upload("scene-ars-003");

    expect(result.previousStatus).toBe("RETAKE_REQUIRED");
    expect(result.status).toBe("PENDING_REVIEW");
  });

  it("leaves an already pending scene status unchanged", async () => {
    const result = await upload("scene-slc-001");

    expect(result.previousStatus).toBe("PENDING_REVIEW");
    expect(result.status).toBe("PENDING_REVIEW");
  });

  it("adds a second take without overwriting the first", async () => {
    const first = await upload("scene-bhc-001", "IMG_0001.png");
    const second = await upload("scene-bhc-001", "IMG_0002.png");

    expect(second.photo.takeNumber).toBe(2);

    const photos = await listScenePhotos("scene-bhc-001");
    expect(photos.map((photo) => [photo.takeNumber, photo.fileName])).toEqual([
      [1, "IMG_0001.png"],
      [2, "IMG_0002.png"],
    ]);
    await expect(readScenePhotoBytes(first.photo.id)).resolves.not.toBeNull();
  });

  it("records capturedAt when the client supplies it", async () => {
    const capturedAt = new Date("2026-10-10T09:30:00.000Z");
    const result = await upload("scene-bhc-001", "IMG_0001.png", {
      capturedAt,
    });

    expect(result.photo.capturedAt).toBe(capturedAt.toISOString());
  });

  it("rejects an unsupported type without writing a row, file, or status", async () => {
    await expect(
      uploadScenePhoto({
        sceneId: "scene-bhc-001",
        fileName: "notes.txt",
        mimeType: "text/plain",
        bytes: Uint8Array.from([1, 2, 3]),
      }),
    ).rejects.toThrow("Unsupported photo type: text/plain");

    await expect(listScenePhotos("scene-bhc-001")).resolves.toEqual([]);
    await expect(readStatus("scene-bhc-001")).resolves.toBe("NOT_SHOT");
  });

  it("rejects an unknown scene id", async () => {
    await expect(upload("scene-missing")).rejects.toThrow(
      "Scene does not exist.",
    );
    await expect(prisma.scenePhoto.count()).resolves.toBe(0);
  });

  it("rejects an unknown trip day id", async () => {
    await expect(
      upload("scene-bhc-001", "IMG_0001.png", {
        tripDayId: "trip-day-missing",
      }),
    ).rejects.toThrow("Trip day does not exist.");

    await expect(prisma.scenePhoto.count()).resolves.toBe(0);
    await expect(readStatus("scene-bhc-001")).resolves.toBe("NOT_SHOT");
  });

  it("rolls back the database row when storage fails", async () => {
    setPhotoStorage({
      save: async () => {
        throw new PhotoStorageError("disk unavailable");
      },
      read: async () => {
        throw new PhotoStorageError("unused");
      },
      delete: async () => undefined,
    });

    await expect(upload("scene-bhc-001")).rejects.toThrow("disk unavailable");

    setPhotoStorage(undefined);
    await expect(prisma.scenePhoto.count()).resolves.toBe(0);
    await expect(readStatus("scene-bhc-001")).resolves.toBe("NOT_SHOT");
  });

  it("does not call storage cleanup when the failure happened before any write", async () => {
    const deleted: string[] = [];
    setPhotoStorage({
      save: async () => {
        throw new PhotoStorageError("disk unavailable");
      },
      read: async () => {
        throw new PhotoStorageError("unused");
      },
      delete: async (descriptor) => {
        deleted.push(descriptor.storageFileId);
      },
    });

    await expect(upload("scene-bhc-001")).rejects.toThrow("disk unavailable");

    expect(deleted).toEqual([]);
  });

  it("records a take on a REVIEWED scene without changing its status", async () => {
    const result = await upload("scene-ars-001");

    expect(result.previousStatus).toBe("REVIEWED");
    expect(result.status).toBe("REVIEWED");
    expect(result.photo.takeNumber).toBe(1);
    await expect(readStatus("scene-ars-001")).resolves.toBe("REVIEWED");
  });
});

describe("scene photo deletion", () => {
  it("deletes one take and preserves the other takes and their files", async () => {
    const first = await upload("scene-bhc-001", "IMG_0001.png");
    const second = await upload("scene-bhc-001", "IMG_0002.png");
    const secondStorageId = (
      await prisma.scenePhoto.findUniqueOrThrow({
        where: { id: second.photo.id },
      })
    ).storageFileId;

    const result = await deleteScenePhoto(first.photo.id);

    expect(result.removedTakeNumber).toBe(1);
    expect(result.remainingTakes).toBe(1);
    expect(result.status).toBe("PENDING_REVIEW");

    const photos = await listScenePhotos("scene-bhc-001");
    expect(photos.map((photo) => photo.takeNumber)).toEqual([2]);
    await expect(storedFileExists(secondStorageId)).resolves.toBe(true);
  });

  it("reverts to NOT_SHOT and removes the file when the last take goes", async () => {
    const only = await upload("scene-bhc-001");
    const storageFileId = (
      await prisma.scenePhoto.findUniqueOrThrow({
        where: { id: only.photo.id },
      })
    ).storageFileId;

    const result = await deleteScenePhoto(only.photo.id);

    expect(result.remainingTakes).toBe(0);
    expect(result.previousStatus).toBe("PENDING_REVIEW");
    expect(result.status).toBe("NOT_SHOT");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("NOT_SHOT");
    await expect(storedFileExists(storageFileId)).resolves.toBe(false);
    await expect(readScenePhotoBytes(only.photo.id)).resolves.toBeNull();
  });

  it("never reuses a take number after deletion", async () => {
    const first = await upload("scene-bhc-001");
    await upload("scene-bhc-001");
    await deleteScenePhoto(first.photo.id);

    const third = await upload("scene-bhc-001");
    expect(third.photo.takeNumber).toBe(3);
  });

  it("rejects deleting a photo that does not exist", async () => {
    await expect(deleteScenePhoto("photo-missing")).rejects.toThrow(
      "Scene photo does not exist.",
    );
  });
});

describe("scene photo trip context", () => {
  it("keeps photos bound to the Scene after the Trip is deleted", async () => {
    const trip = await createTrip({
      name: "Integration Photo Trip",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    });
    const detail = await getTripDetail(trip.tripId);
    const tripDayId = detail?.days[0]?.id ?? "";
    await addSceneToTripDay(tripDayId, "scene-bhc-001");

    const uploaded = await upload("scene-bhc-001", "IMG_0001.png", {
      tripId: trip.tripId,
      tripDayId,
    });
    expect(uploaded.photo.tripId).toBe(trip.tripId);
    expect(uploaded.photo.tripDayId).toBe(tripDayId);

    await deleteTrip(trip.tripId);

    const photos = await listScenePhotos("scene-bhc-001");
    expect(photos).toHaveLength(1);
    expect(photos[0]?.sceneId).toBe("scene-bhc-001");
    expect(photos[0]?.tripId).toBeUndefined();
    expect(photos[0]?.tripDayId).toBeUndefined();
    await expect(
      readScenePhotoBytes(photos[0]?.id ?? ""),
    ).resolves.not.toBeNull();
  });
});

describe("stored photo files", () => {
  it("writes bytes that match the uploaded content", async () => {
    const uploaded = await upload("scene-bhc-001");
    const row = await prisma.scenePhoto.findUniqueOrThrow({
      where: { id: uploaded.photo.id },
    });
    const onDisk = await readFile(
      path.resolve(
        getPhotoStorageDirectory(),
        buildStorageFileName(row.storageFileId, "image/png"),
      ),
    );

    expect(Buffer.from(onDisk)).toEqual(Buffer.from(pngBytes));
    expect(row.fileSize).toBe(pngBytes.byteLength);
  });
});
