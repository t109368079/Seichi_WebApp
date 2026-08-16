import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { countDistinctWorksAtLocation } from "@/application/scene-catalog";
import { prisma as appPrisma } from "@/infrastructure/database/prisma";
import {
  createSceneCatalogItem,
  deleteSceneCatalogItem,
  getSceneCatalogData,
  updateSceneEditableFields,
} from "@/infrastructure/repositories/scene-catalog-repository";
import {
  addSceneToTripDay,
  createTrip,
  getTripDetail,
} from "@/infrastructure/repositories/trip-planning-repository";
import { getDatabaseUrl } from "@/lib/env";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl("test"),
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
  await appPrisma.$connect();
});

afterEach(async () => {
  await prisma.scenePhoto.deleteMany({
    where: {
      storageFileId: {
        startsWith: "manual-scene-catalog-",
      },
    },
  });
  await prisma.trip.deleteMany({
    where: {
      name: {
        startsWith: "Integration Scene Catalog Manual",
      },
    },
  });
  await prisma.scene.deleteMany({
    where: {
      sceneCode: {
        startsWith: "MANUAL-CATALOG-",
      },
    },
  });
  await prisma.location.deleteMany({
    where: {
      areaName: {
        startsWith: "Manual Catalog Area",
      },
      scenes: {
        none: {},
      },
    },
  });
  await prisma.work.deleteMany({
    where: {
      shortCode: {
        startsWith: "MSC",
      },
      scenes: {
        none: {},
      },
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await appPrisma.$disconnect();
});

describe("scene catalog seed data", () => {
  it("creates deterministic demo works, locations, scenes, and statuses", async () => {
    const [workCount, locationCount, sceneCount, statuses] = await Promise.all([
      prisma.work.count(),
      prisma.location.count(),
      prisma.scene.count(),
      prisma.scene.findMany({
        distinct: ["status"],
        select: { status: true },
        orderBy: { status: "asc" },
      }),
    ]);

    expect(workCount).toBe(3);
    expect(locationCount).toBeGreaterThanOrEqual(6);
    expect(sceneCount).toBe(12);
    expect(statuses.map((scene) => scene.status).sort()).toEqual([
      "NOT_SHOT",
      "PENDING_REVIEW",
      "RETAKE_REQUIRED",
      "REVIEWED",
      "SKIPPED",
    ]);
  });

  it("preserves cross-work scenes at the same location", async () => {
    const eastGate = await prisma.location.findUniqueOrThrow({
      where: { id: "location-ikebukuro-east-gate" },
      include: {
        scenes: {
          include: {
            work: true,
            location: true,
          },
          orderBy: { sceneCode: "asc" },
        },
      },
    });

    expect(eastGate.areaName).toBe("Ikebukuro");
    expect(eastGate.scenes.map((scene) => scene.sceneCode)).toEqual([
      "ARS-001",
      "BHC-001",
      "SLC-001",
    ]);
    expect(new Set(eastGate.scenes.map((scene) => scene.workId)).size).toBe(3);
  });

  it("rejects duplicate scene codes at the database boundary", async () => {
    await expect(
      prisma.scene.create({
        data: {
          id: "scene-duplicate-code-test",
          sceneCode: "BHC-001",
          workId: "work-blue-hour-crossing",
          episode: "99",
          animeImageDriveFileId: "demo-drive-duplicate",
          locationId: "location-ikebukuro-east-gate",
          latitude: 35.73028,
          longitude: 139.71145,
          status: "NOT_SHOT",
        },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
    } satisfies Partial<Prisma.PrismaClientKnownRequestError>);
  });
});

describe("scene catalog repository", () => {
  it("filters demo scenes by work, location, and status", async () => {
    const byWork = await getSceneCatalogData({
      workId: "work-blue-hour-crossing",
    });
    const byLocation = await getSceneCatalogData({
      locationId: "location-otsuka-north-exit",
    });
    const byStatus = await getSceneCatalogData({
      status: "RETAKE_REQUIRED",
    });

    expect(byWork.scenes.map((scene) => scene.sceneCode)).toEqual([
      "BHC-001",
      "BHC-002",
      "BHC-003",
      "BHC-004",
    ]);
    expect(byLocation.scenes.map((scene) => scene.sceneCode)).toEqual([
      "ARS-003",
      "BHC-003",
      "SLC-003",
    ]);
    expect(
      countDistinctWorksAtLocation(
        byLocation.scenes,
        "location-otsuka-north-exit",
      ),
    ).toBe(3);
    expect(byStatus.scenes.map((scene) => scene.sceneCode)).toEqual([
      "BHC-002",
      "ARS-003",
    ]);
  });

  it("creates and deletes a manually entered scene", async () => {
    const created = await createSceneCatalogItem({
      sceneCode: "MANUAL-CATALOG-001",
      workName: "Manual Catalog Work",
      workShortCode: "MSC",
      episode: "05",
      animeImageDriveFileId: "manual-scene-catalog-drive-001",
      locationName: "Manual Catalog Station",
      areaName: "Manual Catalog Area",
      latitude: null,
      longitude: null,
      mapsUrl: "https://maps.google.com/?q=35.1,139.2",
      notes: "Manual catalog create test.",
    });

    expect(created).toMatchObject({
      sceneCode: "MANUAL-CATALOG-001",
      episode: "05",
      animeImageDriveFileId: "manual-scene-catalog-drive-001",
      status: "NOT_SHOT",
      work: {
        name: "Manual Catalog Work",
        shortCode: "MSC",
      },
      location: {
        name: "Manual Catalog Station",
        areaName: "Manual Catalog Area",
      },
    });

    const catalog = await getSceneCatalogData({
      workId: created.work.id,
    });
    expect(catalog.scenes.map((scene) => scene.sceneCode)).toContain(
      "MANUAL-CATALOG-001",
    );

    const deleted = await deleteSceneCatalogItem(created.id);
    expect(deleted.sceneCode).toBe("MANUAL-CATALOG-001");
    await expect(
      prisma.scene.findUnique({ where: { id: created.id } }),
    ).resolves.toBeNull();
  });

  it("rejects deleting a scene that is already used by a trip day", async () => {
    const created = await createSceneCatalogItem({
      sceneCode: "MANUAL-CATALOG-TRIP",
      workName: "Manual Catalog Work",
      workShortCode: "MSC",
      episode: undefined,
      animeImageDriveFileId: "manual-scene-catalog-drive-trip",
      locationName: "Manual Catalog Station",
      areaName: "Manual Catalog Area",
      latitude: 35.1,
      longitude: 139.2,
      mapsUrl: undefined,
      notes: undefined,
    });
    const trip = await createTrip({
      name: "Integration Scene Catalog Manual Trip",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
    });
    const detail = await getTripDetail(trip.tripId);
    const tripDayId = detail?.days[0]?.id ?? "";
    await addSceneToTripDay(tripDayId, created.id);

    await expect(deleteSceneCatalogItem(created.id)).rejects.toThrow(
      "Scene is used in trip planning.",
    );
  });

  it("rejects deleting a scene that already has photos", async () => {
    const created = await createSceneCatalogItem({
      sceneCode: "MANUAL-CATALOG-PHOTO",
      workName: "Manual Catalog Work",
      workShortCode: "MSC",
      episode: undefined,
      animeImageDriveFileId: "manual-scene-catalog-drive-photo",
      locationName: "Manual Catalog Station",
      areaName: "Manual Catalog Area",
      latitude: 35.1,
      longitude: 139.2,
      mapsUrl: undefined,
      notes: undefined,
    });
    await prisma.scenePhoto.create({
      data: {
        sceneId: created.id,
        fileName: "manual-scene-catalog.png",
        mimeType: "image/png",
        fileSize: 1,
        storageFileId: "manual-scene-catalog-photo-001",
        takeNumber: 1,
      },
    });

    await expect(deleteSceneCatalogItem(created.id)).rejects.toThrow(
      "Scene has photos.",
    );
  });

  it("updates one scene location and navigation fields without mutating the original shared location", async () => {
    const original = await prisma.scene.findUniqueOrThrow({
      where: {
        id: "scene-bhc-001",
      },
      include: {
        location: {
          include: {
            scenes: {
              orderBy: {
                sceneCode: "asc",
              },
            },
          },
        },
      },
    });
    const editedLocationName = "Edited Station Gate";
    const editedAreaName = "Edited Area";

    try {
      const updated = await updateSceneEditableFields("scene-bhc-001", {
        locationName: editedLocationName,
        areaName: editedAreaName,
        latitude: 35.73123,
        longitude: 139.71234,
        mapsUrl: "https://maps.google.com/?q=35.73123,139.71234",
        notes: "Edited note for integration coverage.",
      });

      expect(updated.location).toMatchObject({
        name: editedLocationName,
        areaName: editedAreaName,
      });
      expect(updated.latitude).toBe(35.73123);
      expect(updated.longitude).toBe(139.71234);
      expect(updated.mapsUrl).toBe(
        "https://maps.google.com/?q=35.73123,139.71234",
      );
      expect(updated.notes).toBe("Edited note for integration coverage.");

      const originalLocation = await prisma.location.findUniqueOrThrow({
        where: {
          id: original.locationId,
        },
        include: {
          scenes: {
            orderBy: {
              sceneCode: "asc",
            },
          },
        },
      });

      expect(originalLocation.scenes.map((scene) => scene.sceneCode)).toEqual([
        "ARS-001",
        "SLC-001",
      ]);
    } finally {
      await updateSceneEditableFields("scene-bhc-001", {
        locationName: original.location.name,
        areaName: original.location.areaName ?? undefined,
        latitude: original.latitude,
        longitude: original.longitude,
        mapsUrl: original.mapsUrl ?? undefined,
        notes: original.notes,
      });
      await prisma.location.deleteMany({
        where: {
          name: editedLocationName,
          areaName: editedAreaName,
          scenes: {
            none: {},
          },
        },
      });
    }
  });
});
