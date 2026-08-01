import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  deleteScenePhoto,
  listScenePhotos,
  uploadScenePhoto,
} from "@/infrastructure/repositories/scene-photo-repository";
import {
  getReviewQueueData,
  getReviewSceneDetail,
  selectBestScenePhoto,
  updateSceneReviewStatus,
} from "@/infrastructure/repositories/review-repository";
import {
  addSceneToTripDay,
  createTrip,
  getTripDetail,
} from "@/infrastructure/repositories/trip-planning-repository";
import { setPhotoStorage } from "@/infrastructure/storage/local-photo-storage";
import { prisma } from "@/infrastructure/database/prisma";

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
  "scene-bhc-002": "RETAKE_REQUIRED",
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
    where: { name: { startsWith: "Integration Review" } },
  });

  for (const [sceneId, status] of Object.entries(seededStatuses)) {
    await prisma.scene.update({ where: { id: sceneId }, data: { status } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

function upload(sceneId: string, fileName = "review-take.png") {
  return uploadScenePhoto({
    sceneId,
    fileName,
    mimeType: "image/png",
    bytes: pngBytes,
  });
}

async function readStatus(sceneId: string): Promise<string | undefined> {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { status: true },
  });

  return scene?.status;
}

describe("review workflow", () => {
  it("uploads, selects a best photo, and marks the scene reviewed", async () => {
    const uploaded = await upload("scene-bhc-001");

    await selectBestScenePhoto(uploaded.photo.id);
    const result = await updateSceneReviewStatus(
      "scene-bhc-001",
      "MARK_REVIEWED",
    );

    expect(result.previousStatus).toBe("PENDING_REVIEW");
    expect(result.status).toBe("REVIEWED");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("REVIEWED");

    const detail = await getReviewSceneDetail("scene-bhc-001");
    expect(detail?.bestPhoto?.id).toBe(uploaded.photo.id);
    expect(detail?.selectedPhoto?.id).toBe(uploaded.photo.id);
  });

  it("rejects reviewed status until a best photo exists", async () => {
    await upload("scene-bhc-001");

    await expect(
      updateSceneReviewStatus("scene-bhc-001", "MARK_REVIEWED"),
    ).rejects.toThrow("Cannot mark a Scene REVIEWED without a best photo");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("PENDING_REVIEW");
  });

  it("replaces the best photo and preserves every take", async () => {
    const first = await upload("scene-bhc-001", "take-1.png");
    const second = await upload("scene-bhc-001", "take-2.png");

    await selectBestScenePhoto(first.photo.id);
    await selectBestScenePhoto(second.photo.id);

    const photos = await listScenePhotos("scene-bhc-001");
    expect(photos.map((photo) => [photo.takeNumber, photo.isBest])).toEqual([
      [1, false],
      [2, true],
    ]);
  });

  it("marks pending scenes for retake without deleting photos", async () => {
    const uploaded = await upload("scene-bhc-001");

    const result = await updateSceneReviewStatus(
      "scene-bhc-001",
      "MARK_RETAKE_REQUIRED",
    );

    expect(result.status).toBe("RETAKE_REQUIRED");
    await expect(listScenePhotos("scene-bhc-001")).resolves.toHaveLength(1);
    await expect(readStatus("scene-bhc-001")).resolves.toBe("RETAKE_REQUIRED");
    await expect(
      prisma.scenePhoto.findUnique({ where: { id: uploaded.photo.id } }),
    ).resolves.not.toBeNull();
  });

  it("uploading a new take to a retake scene returns it to pending review", async () => {
    const result = await upload("scene-bhc-002");

    expect(result.previousStatus).toBe("RETAKE_REQUIRED");
    expect(result.status).toBe("PENDING_REVIEW");
    await expect(readStatus("scene-bhc-002")).resolves.toBe("PENDING_REVIEW");
  });

  it("deleting the best photo reopens a reviewed scene", async () => {
    const first = await upload("scene-bhc-001", "take-1.png");
    await upload("scene-bhc-001", "take-2.png");
    await selectBestScenePhoto(first.photo.id);
    await updateSceneReviewStatus("scene-bhc-001", "MARK_REVIEWED");

    const result = await deleteScenePhoto(first.photo.id);

    expect(result.previousStatus).toBe("REVIEWED");
    expect(result.status).toBe("PENDING_REVIEW");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("PENDING_REVIEW");

    const remaining = await listScenePhotos("scene-bhc-001");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.isBest).toBe(false);
  });

  it("deleting the last best photo on a reviewed scene returns to not shot", async () => {
    const only = await upload("scene-bhc-001");
    await selectBestScenePhoto(only.photo.id);
    await updateSceneReviewStatus("scene-bhc-001", "MARK_REVIEWED");

    const result = await deleteScenePhoto(only.photo.id);

    expect(result.status).toBe("NOT_SHOT");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("NOT_SHOT");
  });

  it("filters review queue by bucket, work, location, and trip", async () => {
    await upload("scene-bhc-001");
    const trip = await createTrip({
      name: "Integration Review Queue Trip",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    });
    const detail = await getTripDetail(trip.tripId);
    const tripDayId = detail?.days[0]?.id ?? "";
    await addSceneToTripDay(tripDayId, "scene-bhc-001");

    const missingBest = await getReviewQueueData({
      bucket: "MISSING_BEST",
      tripId: trip.tripId,
    });
    expect(missingBest.items.map((item) => item.scene.sceneCode)).toEqual([
      "BHC-001",
    ]);

    const byWork = await getReviewQueueData({
      workId: "work-blue-hour-crossing",
      bucket: "MISSING_BEST",
    });
    expect(byWork.items.map((item) => item.scene.sceneCode)).toContain(
      "BHC-001",
    );

    const byLocation = await getReviewQueueData({
      locationId: "location-ikebukuro-east-gate",
      bucket: "PENDING_REVIEW",
    });
    expect(byLocation.items.map((item) => item.scene.sceneCode)).toContain(
      "BHC-001",
    );
  });
});
