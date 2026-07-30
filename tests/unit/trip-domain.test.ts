import { describe, expect, it } from "vitest";
import {
  assertSceneCanBeAddedToTripDay,
  assertValidTripDate,
  assertValidTripDateRange,
  buildTripDayDates,
  getNextTripSceneSortOrder,
  moveTripSceneOrder,
  normalizeTripSceneOrder,
  reorderTripSceneIds,
  summarizeTripProgress,
} from "@/domain/trip";

describe("trip date rules", () => {
  it("validates yyyy-mm-dd dates and inclusive ranges", () => {
    expect(assertValidTripDate("2026-10-10")).toBe("2026-10-10");
    expect(
      buildTripDayDates({
        startDate: "2026-10-10",
        endDate: "2026-10-12",
      }),
    ).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
  });

  it("rejects invalid dates and reversed ranges", () => {
    expect(() => assertValidTripDate("2026-02-30")).toThrow(
      "date must use yyyy-mm-dd format.",
    );
    expect(() =>
      assertValidTripDateRange({
        startDate: "2026-10-12",
        endDate: "2026-10-10",
      }),
    ).toThrow("startDate must be before or equal to endDate.");
  });
});

describe("trip scene order rules", () => {
  it("normalizes order and appends scenes at the end", () => {
    expect(
      normalizeTripSceneOrder([
        { id: "trip-scene-b", sortOrder: 20 },
        { id: "trip-scene-a", sortOrder: 10 },
      ]),
    ).toEqual([
      { id: "trip-scene-a", sortOrder: 1 },
      { id: "trip-scene-b", sortOrder: 2 },
    ]);
    expect(
      getNextTripSceneSortOrder([
        { id: "trip-scene-a", sortOrder: 1 },
        { id: "trip-scene-b", sortOrder: 2 },
      ]),
    ).toBe(3);
  });

  it("moves scenes up and down without changing unrelated identities", () => {
    const scenes = [
      { id: "trip-scene-a", sortOrder: 1 },
      { id: "trip-scene-b", sortOrder: 2 },
      { id: "trip-scene-c", sortOrder: 3 },
    ];

    expect(moveTripSceneOrder(scenes, "trip-scene-b", "up")).toEqual([
      { id: "trip-scene-b", sortOrder: 1 },
      { id: "trip-scene-a", sortOrder: 2 },
      { id: "trip-scene-c", sortOrder: 3 },
    ]);
    expect(moveTripSceneOrder(scenes, "trip-scene-b", "down")).toEqual([
      { id: "trip-scene-a", sortOrder: 1 },
      { id: "trip-scene-c", sortOrder: 2 },
      { id: "trip-scene-b", sortOrder: 3 },
    ]);
  });

  it("builds reorder updates and rejects duplicate trip scene ids", () => {
    expect(reorderTripSceneIds(["trip-scene-c", "trip-scene-a"])).toEqual([
      { id: "trip-scene-c", sortOrder: 1 },
      { id: "trip-scene-a", sortOrder: 2 },
    ]);
    expect(() => reorderTripSceneIds(["trip-scene-a", "trip-scene-a"])).toThrow(
      "TripScene trip-scene-a appears more than once.",
    );
  });

  it("prevents duplicate scenes in the same trip day", () => {
    expect(() =>
      assertSceneCanBeAddedToTripDay(["scene-bhc-001"], "scene-bhc-001"),
    ).toThrow("Scene is already in this trip day.");
  });
});

describe("trip progress summary", () => {
  it("aggregates status counts and missing coordinates", () => {
    expect(
      summarizeTripProgress([
        { status: "NOT_SHOT", latitude: 35, longitude: 139 },
        { status: "PENDING_REVIEW", latitude: 35, longitude: 139 },
        { status: "REVIEWED", latitude: 35, longitude: 139 },
        { status: "RETAKE_REQUIRED", latitude: null, longitude: 139 },
        { status: "SKIPPED", latitude: 35, longitude: Number.NaN },
      ]),
    ).toEqual({
      totalScenes: 5,
      notShot: 1,
      pendingReview: 1,
      reviewed: 1,
      retakeRequired: 1,
      skipped: 1,
      missingCoordinates: 2,
    });
  });
});
