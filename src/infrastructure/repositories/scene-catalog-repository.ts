import {
  filterSceneCatalogItems,
  type SceneCatalogFilters,
  type SceneCatalogItem,
} from "@/application/scene-catalog";
import { assertSceneStatus } from "@/domain/scene";
import { prisma } from "@/infrastructure/database/prisma";

export interface SceneCatalogData {
  scenes: SceneCatalogItem[];
  allScenes: SceneCatalogItem[];
  works: {
    id: string;
    name: string;
    shortCode: string;
  }[];
  locations: {
    id: string;
    name: string;
    areaName: string | undefined;
  }[];
}

export async function getSceneCatalogData(
  filters: SceneCatalogFilters,
): Promise<SceneCatalogData> {
  const [scenes, works, locations] = await Promise.all([
    prisma.scene.findMany({
      include: {
        work: true,
        location: true,
      },
      orderBy: [{ location: { areaName: "asc" } }, { sceneCode: "asc" }],
    }),
    prisma.work.findMany({
      orderBy: { shortCode: "asc" },
    }),
    prisma.location.findMany({
      orderBy: [{ areaName: "asc" }, { name: "asc" }],
    }),
  ]);

  const allScenes = scenes.map<SceneCatalogItem>((scene) => ({
    id: scene.id,
    sceneCode: scene.sceneCode,
    episode: scene.episode ?? undefined,
    animeImageDriveFileId: scene.animeImageDriveFileId,
    latitude: scene.latitude,
    longitude: scene.longitude,
    mapsUrl: scene.mapsUrl ?? undefined,
    notes: scene.notes ?? undefined,
    status: assertSceneStatus(scene.status),
    work: {
      id: scene.work.id,
      name: scene.work.name,
      shortCode: scene.work.shortCode,
    },
    location: {
      id: scene.location.id,
      name: scene.location.name,
      areaName: scene.location.areaName ?? undefined,
    },
  }));

  return {
    scenes: filterSceneCatalogItems(allScenes, filters),
    allScenes,
    works,
    locations: locations.map((location) => ({
      id: location.id,
      name: location.name,
      areaName: location.areaName ?? undefined,
    })),
  };
}

export async function getSceneDetail(
  sceneId: string,
): Promise<SceneCatalogItem | null> {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: {
      work: true,
      location: true,
    },
  });

  if (!scene) {
    return null;
  }

  return {
    id: scene.id,
    sceneCode: scene.sceneCode,
    episode: scene.episode ?? undefined,
    animeImageDriveFileId: scene.animeImageDriveFileId,
    latitude: scene.latitude,
    longitude: scene.longitude,
    mapsUrl: scene.mapsUrl ?? undefined,
    notes: scene.notes ?? undefined,
    status: assertSceneStatus(scene.status),
    work: {
      id: scene.work.id,
      name: scene.work.name,
      shortCode: scene.work.shortCode,
    },
    location: {
      id: scene.location.id,
      name: scene.location.name,
      areaName: scene.location.areaName ?? undefined,
    },
  };
}
