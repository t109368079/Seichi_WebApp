import { describe, expect, it } from "vitest";
import {
  applyBestPhotoSelection,
  assertBestPhotoUniqueness,
  assertReviewStatusTransition,
  canMarkSceneReviewed,
  matchesReviewBucket,
} from "@/domain/review";
import {
  chooseSelectedReviewPhoto,
  filterReviewQueueItems,
  summarizeReviewQueue,
  type ReviewQueueItem,
} from "@/application/review";
import type { SceneCatalogItem } from "@/application/scene-catalog";
import type { ScenePhotoItem } from "@/application/scene-photo";
import type { SceneStatus } from "@/domain/scene";

describe("review status eligibility", () => {
  it("requires at least one best photo before reviewed", () => {
    expect(canMarkSceneReviewed({ status: "PENDING_REVIEW", photos: [] })).toBe(
      false,
    );
    expect(
      canMarkSceneReviewed({
        status: "PENDING_REVIEW",
        photos: [{ id: "photo-1", isBest: false }],
      }),
    ).toBe(false);
    expect(
      canMarkSceneReviewed({
        status: "PENDING_REVIEW",
        photos: [{ id: "photo-1", isBest: true }],
      }),
    ).toBe(true);
  });

  it("accepts approved review transitions", () => {
    expect(
      assertReviewStatusTransition(
        {
          status: "PENDING_REVIEW",
          photos: [{ id: "photo-1", isBest: true }],
        },
        "MARK_REVIEWED",
      ),
    ).toBe("REVIEWED");
    expect(
      assertReviewStatusTransition(
        {
          status: "PENDING_REVIEW",
          photos: [{ id: "photo-1", isBest: false }],
        },
        "MARK_RETAKE_REQUIRED",
      ),
    ).toBe("RETAKE_REQUIRED");
    expect(
      assertReviewStatusTransition(
        {
          status: "RETAKE_REQUIRED",
          photos: [{ id: "photo-1", isBest: false }],
        },
        "MARK_PENDING_REVIEW",
      ),
    ).toBe("PENDING_REVIEW");
  });

  it("rejects reviewed without photos or a best photo", () => {
    expect(() =>
      assertReviewStatusTransition(
        { status: "PENDING_REVIEW", photos: [] },
        "MARK_REVIEWED",
      ),
    ).toThrow("Cannot mark a Scene REVIEWED without photos");
    expect(() =>
      assertReviewStatusTransition(
        {
          status: "PENDING_REVIEW",
          photos: [{ id: "photo-1", isBest: false }],
        },
        "MARK_REVIEWED",
      ),
    ).toThrow("Cannot mark a Scene REVIEWED without a best photo");
  });

  it("rejects review actions that are outside the approved transition table", () => {
    expect(() =>
      assertReviewStatusTransition(
        {
          status: "RETAKE_REQUIRED",
          photos: [{ id: "photo-1", isBest: true }],
        },
        "MARK_REVIEWED",
      ),
    ).toThrow("Illegal SceneStatus transition: RETAKE_REQUIRED -> REVIEWED");
    expect(() =>
      assertReviewStatusTransition(
        {
          status: "REVIEWED",
          photos: [{ id: "photo-1", isBest: true }],
        },
        "MARK_RETAKE_REQUIRED",
      ),
    ).toThrow("Illegal SceneStatus transition: REVIEWED -> RETAKE_REQUIRED");
  });
});

describe("best photo selection", () => {
  it("selects exactly one best photo and clears the previous best", () => {
    const selected = applyBestPhotoSelection(
      [
        { id: "photo-1", isBest: true },
        { id: "photo-2", isBest: false },
      ],
      "photo-2",
    );

    expect(selected).toEqual([
      { id: "photo-1", isBest: false },
      { id: "photo-2", isBest: true },
    ]);
    expect(() => assertBestPhotoUniqueness(selected)).not.toThrow();
  });

  it("rejects selecting a photo outside the scene", () => {
    expect(() =>
      applyBestPhotoSelection([{ id: "photo-1", isBest: false }], "photo-2"),
    ).toThrow("Scene photo does not belong to this Scene.");
  });

  it("detects impossible multiple-best state", () => {
    expect(() =>
      assertBestPhotoUniqueness([
        { isBest: true },
        { isBest: true },
        { isBest: false },
      ]),
    ).toThrow("A Scene can have at most one best photo.");
  });
});

describe("review queue buckets and filters", () => {
  const items = [
    queueItem("scene-a", "BHC-001", "PENDING_REVIEW", [
      photo("photo-a", false),
    ]),
    queueItem("scene-b", "BHC-002", "RETAKE_REQUIRED", [
      photo("photo-b", true),
    ]),
    queueItem("scene-c", "SLC-001", "NOT_SHOT", []),
    queueItem("scene-d", "SLC-002", "REVIEWED", [photo("photo-d", true)]),
  ];

  it("matches overlapping missing-best and status buckets", () => {
    expect(
      matchesReviewBucket(
        { status: "PENDING_REVIEW", photoCount: 1, hasBestPhoto: false },
        "PENDING_REVIEW",
      ),
    ).toBe(true);
    expect(
      matchesReviewBucket(
        { status: "PENDING_REVIEW", photoCount: 1, hasBestPhoto: false },
        "MISSING_BEST",
      ),
    ).toBe(true);
  });

  it("summarizes review queue buckets", () => {
    expect(summarizeReviewQueue(items)).toEqual({
      totalScenes: 4,
      pendingReview: 1,
      retakeRequired: 1,
      notShot: 1,
      missingBest: 1,
      reviewed: 1,
    });
  });

  it("filters by bucket, status, work, location, and trip", () => {
    expect(
      filterReviewQueueItems(items, { bucket: "MISSING_BEST" }).map(
        (item) => item.scene.sceneCode,
      ),
    ).toEqual(["BHC-001"]);
    expect(
      filterReviewQueueItems(items, { status: "REVIEWED" }).map(
        (item) => item.scene.sceneCode,
      ),
    ).toEqual(["SLC-002"]);
    expect(
      filterReviewQueueItems(items, { workId: "work-bhc" }).map(
        (item) => item.scene.sceneCode,
      ),
    ).toEqual(["BHC-001", "BHC-002"]);
    expect(
      filterReviewQueueItems(items, { locationId: "location-1" }).map(
        (item) => item.scene.sceneCode,
      ),
    ).toEqual(["BHC-001", "SLC-001"]);
    expect(
      filterReviewQueueItems(items, { tripId: "trip-1" }).map(
        (item) => item.scene.sceneCode,
      ),
    ).toEqual(["BHC-001", "SLC-002"]);
  });

  it("prefers requested photo, then best photo, then first take", () => {
    const photos = [
      photo("photo-1", false, 1),
      photo("photo-2", true, 2),
      photo("photo-3", false, 3),
    ];

    expect(chooseSelectedReviewPhoto(photos, "photo-3")?.id).toBe("photo-3");
    expect(chooseSelectedReviewPhoto(photos)?.id).toBe("photo-2");
    expect(chooseSelectedReviewPhoto([photo("photo-1", false)])?.id).toBe(
      "photo-1",
    );
    expect(chooseSelectedReviewPhoto([])).toBeUndefined();
  });
});

function queueItem(
  sceneId: string,
  sceneCode: string,
  status: SceneStatus,
  photos: ScenePhotoItem[],
): ReviewQueueItem {
  const workId = sceneCode.startsWith("BHC") ? "work-bhc" : "work-slc";
  const locationId = sceneCode.endsWith("001") ? "location-1" : "location-2";

  return {
    scene: scene(sceneId, sceneCode, status, workId, locationId),
    photos,
    photoCount: photos.length,
    hasBestPhoto: photos.some((item) => item.isBest),
    bestPhoto: photos.find((item) => item.isBest),
    tripIds:
      sceneCode === "BHC-001" || sceneCode === "SLC-002" ? ["trip-1"] : [],
    tripNames:
      sceneCode === "BHC-001" || sceneCode === "SLC-002" ? ["Review Trip"] : [],
  };
}

function scene(
  id: string,
  sceneCode: string,
  status: SceneStatus,
  workId: string,
  locationId: string,
): SceneCatalogItem {
  return {
    id,
    sceneCode,
    animeImageDriveFileId: `drive-${sceneCode}`,
    latitude: 35,
    longitude: 139,
    status,
    work: {
      id: workId,
      name: workId,
      shortCode: workId,
    },
    location: {
      id: locationId,
      name: locationId,
    },
  };
}

function photo(id: string, isBest: boolean, takeNumber = 1): ScenePhotoItem {
  return {
    id,
    sceneId: "scene-a",
    fileName: `${id}.png`,
    mimeType: "image/png",
    fileSize: 1024,
    takeNumber,
    isBest,
    uploadedAt: "2026-10-10T00:00:00.000Z",
  };
}
