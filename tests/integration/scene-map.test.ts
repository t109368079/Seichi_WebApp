import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
});
