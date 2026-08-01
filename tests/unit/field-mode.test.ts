import { describe, expect, it } from "vitest";
import {
  buildFieldSceneCursor,
  getFieldCompletionSummary,
  getFieldSceneActions,
  getFieldStatusActionLabel,
  isFieldSceneReadOnly,
  resolveTodayTripDayId,
} from "@/application/field-mode";
import type { TripDaySceneItem } from "@/application/trip-planning";
import type { SceneCatalogItem } from "@/application/scene-catalog";
import type { SceneStatus } from "@/domain/scene";
import { getLocalTripDateString, summarizeTripProgress } from "@/domain/trip";

const dayScenes: TripDaySceneItem[] = [
  tripScene("trip-scene-1", 1, "BHC-001", "NOT_SHOT"),
  tripScene("trip-scene-2", 2, "SLC-001", "PENDING_REVIEW"),
  tripScene("trip-scene-3", 3, "ARS-001", "RETAKE_REQUIRED"),
];

describe("field scene cursor", () => {
  it("has no previous target on the first scene", () => {
    const cursor = buildFieldSceneCursor(dayScenes, "trip-scene-1");

    expect(cursor?.previous).toBeUndefined();
    expect(cursor?.next?.id).toBe("trip-scene-2");
    expect(cursor?.position).toBe(1);
    expect(cursor?.total).toBe(3);
  });

  it("resolves both neighbours in the middle of the day", () => {
    const cursor = buildFieldSceneCursor(dayScenes, "trip-scene-2");

    expect(cursor?.previous?.id).toBe("trip-scene-1");
    expect(cursor?.next?.id).toBe("trip-scene-3");
    expect(cursor?.position).toBe(2);
  });

  it("has no next target on the last scene", () => {
    const cursor = buildFieldSceneCursor(dayScenes, "trip-scene-3");

    expect(cursor?.previous?.id).toBe("trip-scene-2");
    expect(cursor?.next).toBeUndefined();
    expect(cursor?.position).toBe(3);
  });

  it("has no neighbours when the day holds a single scene", () => {
    const cursor = buildFieldSceneCursor([dayScenes[0]!], "trip-scene-1");

    expect(cursor?.previous).toBeUndefined();
    expect(cursor?.next).toBeUndefined();
    expect(cursor?.total).toBe(1);
  });

  it("returns undefined for an unknown or absent trip scene", () => {
    expect(buildFieldSceneCursor(dayScenes, "trip-scene-missing")).toBe(
      undefined,
    );
    expect(buildFieldSceneCursor([], "trip-scene-1")).toBe(undefined);
  });

  it("follows the given manual order rather than scene code order", () => {
    const reversed = [...dayScenes].reverse();
    const cursor = buildFieldSceneCursor(reversed, "trip-scene-3");

    expect(cursor?.position).toBe(1);
    expect(cursor?.next?.id).toBe("trip-scene-2");
  });
});

describe("today resolution", () => {
  const days = [
    { id: "day-1", date: "2026-10-10" },
    { id: "day-2", date: "2026-10-11" },
  ];

  it("matches the trip day sharing the local calendar date", () => {
    expect(resolveTodayTripDayId(days, "2026-10-11")).toBe("day-2");
  });

  it("returns undefined when no day matches", () => {
    expect(resolveTodayTripDayId(days, "2026-12-25")).toBe(undefined);
    expect(resolveTodayTripDayId([], "2026-10-10")).toBe(undefined);
  });

  it("derives the local calendar date across a UTC day boundary", () => {
    // 2026-10-11T01:30+08:00 is still 2026-10-10 in UTC.
    const earlyMorning = new Date(2026, 9, 11, 1, 30, 0);

    expect(getLocalTripDateString(earlyMorning)).toBe("2026-10-11");
    expect(
      resolveTodayTripDayId(days, getLocalTripDateString(earlyMorning)),
    ).toBe("day-2");
  });

  it("pads single digit months and days", () => {
    expect(getLocalTripDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("field completion summary", () => {
  it("counts not shot and retake required as remaining work", () => {
    const summary = getFieldCompletionSummary(
      summarizeTripProgress(dayScenes.map((item) => item.scene)),
    );

    expect(summary).toEqual({
      total: 3,
      handled: 1,
      remaining: 2,
      percent: 33,
    });
  });

  it("reports zero percent for an empty day without dividing by zero", () => {
    expect(getFieldCompletionSummary(summarizeTripProgress([]))).toEqual({
      total: 0,
      handled: 0,
      remaining: 0,
      percent: 0,
    });
  });

  it("reaches full completion when nothing is outstanding", () => {
    const summary = getFieldCompletionSummary(
      summarizeTripProgress([
        catalogScene("SLC-001", "PENDING_REVIEW"),
        catalogScene("ARS-001", "SKIPPED"),
      ]),
    );

    expect(summary.percent).toBe(100);
    expect(summary.remaining).toBe(0);
  });
});

describe("field status presentation", () => {
  it("marks REVIEWED scenes read only", () => {
    expect(isFieldSceneReadOnly("REVIEWED")).toBe(true);
    expect(isFieldSceneReadOnly("NOT_SHOT")).toBe(false);
    expect(getFieldSceneActions("REVIEWED")).toEqual([]);
  });

  it("labels every field action in Traditional Chinese", () => {
    expect(getFieldStatusActionLabel("MARK_PENDING_REVIEW")).toBe("標記待確認");
    expect(getFieldStatusActionLabel("MARK_RETAKE_REQUIRED")).toBe(
      "標記需要補拍",
    );
    expect(getFieldStatusActionLabel("MARK_SKIPPED")).toBe("跳過此場景");
    expect(getFieldStatusActionLabel("RESET_TO_NOT_SHOT")).toBe("返回未拍攝");
  });
});

function tripScene(
  id: string,
  sortOrder: number,
  sceneCode: string,
  status: SceneStatus,
): TripDaySceneItem {
  return {
    id,
    sortOrder,
    scene: catalogScene(sceneCode, status),
  };
}

function catalogScene(
  sceneCode: string,
  status: SceneStatus,
): SceneCatalogItem {
  return {
    id: `scene-${sceneCode.toLowerCase()}`,
    sceneCode,
    episode: "01",
    animeImageDriveFileId: `demo-drive-${sceneCode.toLowerCase()}`,
    latitude: 35.73028,
    longitude: 139.71145,
    status,
    work: {
      id: "work-blue-hour-crossing",
      name: "Blue Hour Crossing",
      shortCode: "BHC",
    },
    location: {
      id: "location-ikebukuro-east-gate",
      name: "Ikebukuro Station East Gate",
      areaName: "Ikebukuro",
    },
  };
}
