import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  getFieldModeDay,
  getFieldModeScene,
  resolveTodayFieldTripDayId,
  updateSceneStatusFromField,
} from "@/infrastructure/repositories/field-mode-repository";
import {
  addSceneToTripDay,
  createTrip,
  getTripDetail,
} from "@/infrastructure/repositories/trip-planning-repository";
import { prisma } from "@/infrastructure/database/prisma";

/**
 * Seeded statuses this suite mutates. They are restored after every test so a
 * repeated `test:integration` run without a database reset stays green.
 */
const seededStatuses = {
  "scene-bhc-001": "NOT_SHOT",
  "scene-slc-001": "PENDING_REVIEW",
  "scene-ars-001": "REVIEWED",
} as const;

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

  for (const [sceneId, status] of Object.entries(seededStatuses)) {
    await prisma.scene.update({
      where: { id: sceneId },
      data: { status },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createFieldDay(name: string, sceneIds: readonly string[]) {
  const trip = await createTrip({
    name,
    startDate: "2026-10-10",
    endDate: "2026-10-11",
  });
  const detail = await getTripDetail(trip.tripId);
  const tripDayId = detail?.days[0]?.id ?? "";

  for (const sceneId of sceneIds) {
    await addSceneToTripDay(tripDayId, sceneId);
  }

  return { tripId: trip.tripId, tripDayId };
}

describe("field mode repository", () => {
  it("returns the day in manual sortOrder with a field completion summary", async () => {
    const { tripDayId } = await createFieldDay("Integration Field Day", [
      "scene-bhc-001",
      "scene-slc-001",
      "scene-ars-001",
    ]);

    const day = await getFieldModeDay(tripDayId);

    expect(day?.date).toBe("2026-10-10");
    expect(day?.tripName).toBe("Integration Field Day");
    expect(day?.scenes.map((item) => item.scene.sceneCode)).toEqual([
      "BHC-001",
      "SLC-001",
      "ARS-001",
    ]);
    expect(day?.completion).toEqual({
      total: 3,
      handled: 2,
      remaining: 1,
      percent: 67,
    });
  });

  it("returns null for an unknown trip day", async () => {
    await expect(getFieldModeDay("trip-day-missing")).resolves.toBeNull();
  });

  it("resolves previous and next across a persisted day", async () => {
    const { tripDayId } = await createFieldDay("Integration Field Cursor", [
      "scene-bhc-001",
      "scene-slc-001",
      "scene-ars-001",
    ]);
    const day = await getFieldModeDay(tripDayId);
    const [first, middle, last] = day?.scenes ?? [];

    const firstView = await getFieldModeScene(tripDayId, first?.id ?? "");
    expect(firstView?.cursor.previous).toBeUndefined();
    expect(firstView?.cursor.next?.scene.sceneCode).toBe("SLC-001");
    expect(firstView?.cursor.position).toBe(1);

    const middleView = await getFieldModeScene(tripDayId, middle?.id ?? "");
    expect(middleView?.cursor.previous?.scene.sceneCode).toBe("BHC-001");
    expect(middleView?.cursor.next?.scene.sceneCode).toBe("ARS-001");

    const lastView = await getFieldModeScene(tripDayId, last?.id ?? "");
    expect(lastView?.cursor.next).toBeUndefined();
    expect(lastView?.cursor.position).toBe(3);

    await expect(
      getFieldModeScene(tripDayId, "trip-scene-missing"),
    ).resolves.toBeNull();
  });

  it("persists a legal status transition and refreshes the day summary", async () => {
    const { tripDayId } = await createFieldDay("Integration Field Status", [
      "scene-bhc-001",
    ]);

    const result = await updateSceneStatusFromField(
      "scene-bhc-001",
      "MARK_PENDING_REVIEW",
    );

    expect(result).toEqual({
      sceneId: "scene-bhc-001",
      previousStatus: "NOT_SHOT",
      status: "PENDING_REVIEW",
    });

    const reloaded = await getFieldModeDay(tripDayId);
    expect(reloaded?.scenes[0]?.scene.status).toBe("PENDING_REVIEW");
    expect(reloaded?.completion.handled).toBe(1);
    expect(reloaded?.completion.remaining).toBe(0);
  });

  it("supports the reversible field loop back to NOT_SHOT", async () => {
    await createFieldDay("Integration Field Reversible", ["scene-bhc-001"]);

    await updateSceneStatusFromField("scene-bhc-001", "MARK_RETAKE_REQUIRED");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("RETAKE_REQUIRED");

    await updateSceneStatusFromField("scene-bhc-001", "MARK_PENDING_REVIEW");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("PENDING_REVIEW");

    await updateSceneStatusFromField("scene-bhc-001", "RESET_TO_NOT_SHOT");
    await expect(readStatus("scene-bhc-001")).resolves.toBe("NOT_SHOT");
  });

  it("rejects an illegal transition and leaves the stored status unchanged", async () => {
    await createFieldDay("Integration Field Illegal", ["scene-slc-001"]);

    await updateSceneStatusFromField("scene-slc-001", "MARK_SKIPPED");

    await expect(
      updateSceneStatusFromField("scene-slc-001", "MARK_RETAKE_REQUIRED"),
    ).rejects.toThrow(
      "Illegal SceneStatus transition: SKIPPED -> RETAKE_REQUIRED",
    );
    await expect(readStatus("scene-slc-001")).resolves.toBe("SKIPPED");
  });

  it("refuses every field action on a REVIEWED scene", async () => {
    await createFieldDay("Integration Field Reviewed", ["scene-ars-001"]);

    for (const action of [
      "MARK_PENDING_REVIEW",
      "MARK_RETAKE_REQUIRED",
      "MARK_SKIPPED",
      "RESET_TO_NOT_SHOT",
    ] as const) {
      await expect(
        updateSceneStatusFromField("scene-ars-001", action),
      ).rejects.toThrow("Illegal SceneStatus transition: REVIEWED ->");
    }

    await expect(readStatus("scene-ars-001")).resolves.toBe("REVIEWED");
  });

  it("rejects a status update for a missing scene", async () => {
    await expect(
      updateSceneStatusFromField("scene-missing", "MARK_SKIPPED"),
    ).rejects.toThrow("Scene does not exist.");
  });

  it("resolves today to the matching day and falls back to the first day", async () => {
    const { tripId, tripDayId } = await createFieldDay(
      "Integration Field Today",
      [],
    );
    const detail = await getTripDetail(tripId);
    const secondDayId = detail?.days[1]?.id;

    await expect(
      resolveTodayFieldTripDayId(tripId, "2026-10-11"),
    ).resolves.toBe(secondDayId);
    await expect(
      resolveTodayFieldTripDayId(tripId, "2030-01-01"),
    ).resolves.toBe(tripDayId);
    await expect(
      resolveTodayFieldTripDayId("trip-missing", "2026-10-10"),
    ).resolves.toBeUndefined();
  });
});

async function readStatus(sceneId: string): Promise<string | undefined> {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { status: true },
  });

  return scene?.status;
}
