import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  addSceneToTripDay,
  createTrip,
  deleteTrip,
  getTripDetail,
  moveTripSceneInDay,
  removeTripScene,
  reorderTripDayScenes,
} from "@/infrastructure/repositories/trip-planning-repository";
import { prisma } from "@/infrastructure/database/prisma";

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.trip.deleteMany({
    where: {
      name: {
        startsWith: "Integration",
      },
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("trip planning repository", () => {
  it("creates a Trip and generated TripDays for the full date range", async () => {
    const result = await createTrip({
      name: "Integration Tokyo",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
    });
    const detail = await getTripDetail(result.tripId);

    expect(detail?.name).toBe("Integration Tokyo");
    expect(detail?.days.map((day) => day.date)).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
    ]);
    expect(detail?.summary.totalScenes).toBe(0);
  });

  it("adds scenes to a TripDay and rejects duplicates", async () => {
    const trip = await createTrip({
      name: "Integration Duplicate Guard",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    });
    const detail = await getTripDetail(trip.tripId);
    const tripDayId = detail?.days[0]?.id ?? "";

    await addSceneToTripDay(tripDayId, "scene-bhc-001");

    await expect(addSceneToTripDay(tripDayId, "scene-bhc-001")).rejects.toThrow(
      "Scene is already in this trip day.",
    );

    const updated = await getTripDetail(trip.tripId);
    expect(
      updated?.days[0]?.scenes.map((item) => item.scene.sceneCode),
    ).toEqual(["BHC-001"]);
  });

  it("reorders, moves, removes, and persists TripScene order", async () => {
    const trip = await createTrip({
      name: "Integration Ordering",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    });
    const detail = await getTripDetail(trip.tripId);
    const tripDayId = detail?.days[0]?.id ?? "";

    await addSceneToTripDay(tripDayId, "scene-bhc-001");
    await addSceneToTripDay(tripDayId, "scene-slc-001");
    await addSceneToTripDay(tripDayId, "scene-ars-001");

    const withScenes = await getTripDetail(trip.tripId);
    const tripScenes = withScenes?.days[0]?.scenes ?? [];
    await reorderTripDayScenes(
      tripDayId,
      tripScenes.map((item) => item.id).reverse(),
    );

    const reordered = await getTripDetail(trip.tripId);
    expect(
      reordered?.days[0]?.scenes.map((item) => [
        item.scene.sceneCode,
        item.sortOrder,
      ]),
    ).toEqual([
      ["ARS-001", 1],
      ["SLC-001", 2],
      ["BHC-001", 3],
    ]);

    const slcTripSceneId = reordered?.days[0]?.scenes.find(
      (item) => item.scene.sceneCode === "SLC-001",
    )?.id;
    await moveTripSceneInDay(slcTripSceneId ?? "", "up");

    const moved = await getTripDetail(trip.tripId);
    expect(moved?.days[0]?.scenes.map((item) => item.scene.sceneCode)).toEqual([
      "SLC-001",
      "ARS-001",
      "BHC-001",
    ]);

    const arsTripSceneId = moved?.days[0]?.scenes.find(
      (item) => item.scene.sceneCode === "ARS-001",
    )?.id;
    await removeTripScene(arsTripSceneId ?? "");

    const removed = await getTripDetail(trip.tripId);
    expect(
      removed?.days[0]?.scenes.map((item) => [
        item.scene.sceneCode,
        item.sortOrder,
      ]),
    ).toEqual([
      ["SLC-001", 1],
      ["BHC-001", 2],
    ]);
  });

  it("deletes Trip planning rows without deleting Scene records", async () => {
    const trip = await createTrip({
      name: "Integration Delete",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    });
    const detail = await getTripDetail(trip.tripId);
    const tripDayId = detail?.days[0]?.id ?? "";
    await addSceneToTripDay(tripDayId, "scene-bhc-001");

    await deleteTrip(trip.tripId);

    await expect(getTripDetail(trip.tripId)).resolves.toBeNull();
    await expect(
      prisma.scene.findUnique({
        where: {
          id: "scene-bhc-001",
        },
      }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.tripScene.count({
        where: {
          sceneId: "scene-bhc-001",
        },
      }),
    ).resolves.toBe(0);
  });

  it("summarizes trip progress from seeded scene statuses", async () => {
    const trip = await createTrip({
      name: "Integration Summary",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    });
    const detail = await getTripDetail(trip.tripId);
    const tripDayId = detail?.days[0]?.id ?? "";

    await addSceneToTripDay(tripDayId, "scene-bhc-001");
    await addSceneToTripDay(tripDayId, "scene-slc-001");
    await addSceneToTripDay(tripDayId, "scene-ars-001");

    const updated = await getTripDetail(trip.tripId);
    expect(updated?.summary).toMatchObject({
      totalScenes: 3,
      notShot: 1,
      pendingReview: 1,
      reviewed: 1,
      retakeRequired: 0,
      skipped: 0,
      missingCoordinates: 0,
    });
  });
});
