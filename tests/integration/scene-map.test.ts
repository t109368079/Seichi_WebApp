import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { countDistinctWorksAtLocation } from "@/application/scene-catalog";
import { getSceneCatalogData } from "@/infrastructure/repositories/scene-catalog-repository";
import { prisma } from "@/infrastructure/database/prisma";
import { getSceneMapData } from "@/infrastructure/repositories/scene-map-repository";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.scene.deleteMany({
    where: { id: "scene-url-map-001" },
  });
  await prisma.location.deleteMany({
    where: { id: "location-url-map" },
  });
  await prisma.work.deleteMany({
    where: { id: "work-url-map" },
  });
});

describe("scene map repository", () => {
  it("returns deterministic map data from seeded scenes", async () => {
    const mapData = await getSceneMapData({});

    expect(mapData.mapScenes).toHaveLength(12);
    expect(mapData.markerGroups).toHaveLength(6);
    expect(mapData.omittedSceneCount).toBe(0);
    expect(mapData.markerGroups.map((group) => group.label)).toEqual([
      "Ikebukuro Station East Gate",
      "Minami-Ikebukuro Park",
      "Sunshine Street Crossing",
      "Gokokuji Slope",
      "Otsuka Station North Exit",
      "Toden Otsuka Platform",
    ]);
  });

  it("groups cross-work same-location scenes without losing work identity", async () => {
    const mapData = await getSceneMapData({
      locationId: "location-ikebukuro-east-gate",
    });
    const group = mapData.markerGroups[0];

    expect(group?.sceneCount).toBe(3);
    expect(group?.scenes.map((scene) => scene.sceneCode)).toEqual([
      "ARS-001",
      "BHC-001",
      "SLC-001",
    ]);
    expect(
      countDistinctWorksAtLocation(
        group?.scenes ?? [],
        "location-ikebukuro-east-gate",
      ),
    ).toBe(3);
  });

  it("matches catalog filters for work, location, and status", async () => {
    const filters = {
      status: "RETAKE_REQUIRED" as const,
    };
    const [catalogData, mapData] = await Promise.all([
      getSceneCatalogData(filters),
      getSceneMapData(filters),
    ]);

    expect(mapData.mapScenes.map((scene) => scene.sceneCode)).toEqual(
      catalogData.scenes.map((scene) => scene.sceneCode),
    );
    expect(mapData.markerGroups.map((group) => group.sceneCount)).toEqual([
      1, 1,
    ]);
  });

  it("includes URL-only scenes as map marker groups", async () => {
    await prisma.work.create({
      data: {
        id: "work-url-map",
        name: "URL Map Work",
        shortCode: "URLM",
      },
    });
    await prisma.location.create({
      data: {
        id: "location-url-map",
        name: "URL Only Map Place",
        areaName: "URL Area",
        mapsUrl: "Tokyo Station",
      },
    });
    await prisma.scene.create({
      data: {
        id: "scene-url-map-001",
        sceneCode: "URL-MAP-001",
        workId: "work-url-map",
        episode: "01",
        animeImageDriveFileId: "demo-drive-url-map-001",
        locationId: "location-url-map",
        mapsUrl: "Tokyo Station",
      },
    });

    const mapData = await getSceneMapData({ workId: "work-url-map" });

    expect(mapData.mapScenes.map((scene) => scene.sceneCode)).toEqual([
      "URL-MAP-001",
    ]);
    expect(mapData.omittedSceneCount).toBe(0);
    expect(mapData.markerGroups).toHaveLength(1);
    expect(mapData.markerGroups[0]).toMatchObject({
      label: "URL Only Map Place",
      latitude: null,
      longitude: null,
      mapsUrl: "Tokyo Station",
      sceneCount: 1,
    });
  });
});
