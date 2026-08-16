import {
  filterSceneCatalogItems,
  type SceneCatalogFilters,
  type SceneCreateInput,
  type SceneCatalogItem,
  type SceneEditableFieldsUpdate,
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

  const allScenes = scenes.map(mapSceneCatalogItem);

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

  return mapSceneCatalogItem(scene);
}

export async function createSceneCatalogItem(
  input: SceneCreateInput,
): Promise<SceneCatalogItem> {
  return prisma.$transaction(async (transaction) => {
    const existingScene = await transaction.scene.findUnique({
      where: {
        sceneCode: input.sceneCode,
      },
      select: {
        id: true,
      },
    });

    if (existingScene) {
      throw new Error("Scene sceneCode already exists.");
    }

    const work = await transaction.work.upsert({
      where: {
        shortCode: input.workShortCode,
      },
      create: {
        name: input.workName,
        shortCode: input.workShortCode,
      },
      update: {
        name: input.workName,
      },
    });

    const location = await transaction.location.upsert({
      where: {
        name_areaName: {
          name: input.locationName,
          areaName: input.areaName,
        },
      },
      create: {
        name: input.locationName,
        areaName: input.areaName,
        latitude: input.latitude,
        longitude: input.longitude,
        mapsUrl: input.mapsUrl ?? null,
      },
      update: {
        latitude: input.latitude,
        longitude: input.longitude,
        mapsUrl: input.mapsUrl ?? null,
      },
    });

    const createdScene = await transaction.scene.create({
      data: {
        sceneCode: input.sceneCode,
        workId: work.id,
        episode: input.episode ?? null,
        animeImageDriveFileId: input.animeImageDriveFileId,
        locationId: location.id,
        latitude: input.latitude,
        longitude: input.longitude,
        mapsUrl: input.mapsUrl ?? null,
        notes: input.notes ?? null,
        status: "NOT_SHOT",
      },
      include: {
        work: true,
        location: true,
      },
    });

    return mapSceneCatalogItem(createdScene);
  });
}

export async function deleteSceneCatalogItem(sceneId: string): Promise<{
  sceneCode: string;
}> {
  if (sceneId.trim().length === 0) {
    throw new Error("Scene id is required.");
  }

  return prisma.$transaction(async (transaction) => {
    const scene = await transaction.scene.findUnique({
      where: {
        id: sceneId,
      },
      select: {
        id: true,
        sceneCode: true,
        _count: {
          select: {
            photos: true,
            tripScenes: true,
          },
        },
      },
    });

    if (!scene) {
      throw new Error("Scene does not exist.");
    }

    if (scene._count.tripScenes > 0) {
      throw new Error("Scene is used in trip planning.");
    }

    if (scene._count.photos > 0) {
      throw new Error("Scene has photos.");
    }

    await transaction.scene.delete({
      where: {
        id: scene.id,
      },
    });

    return {
      sceneCode: scene.sceneCode,
    };
  });
}

export async function updateSceneEditableFields(
  sceneId: string,
  input: SceneEditableFieldsUpdate,
): Promise<SceneCatalogItem> {
  if (sceneId.trim().length === 0) {
    throw new Error("Scene id is required.");
  }

  const areaName = input.areaName ?? null;

  return prisma.$transaction(async (transaction) => {
    const existingScene = await transaction.scene.findUnique({
      where: {
        id: sceneId,
      },
      select: {
        id: true,
      },
    });

    if (!existingScene) {
      throw new Error("Scene does not exist.");
    }

    const existingLocation = await transaction.location.findFirst({
      where: {
        name: input.locationName,
        areaName,
      },
      orderBy: {
        id: "asc",
      },
    });
    const location =
      existingLocation ??
      (await transaction.location.create({
        data: {
          name: input.locationName,
          areaName,
          latitude: input.latitude,
          longitude: input.longitude,
          mapsUrl: input.mapsUrl ?? null,
        },
      }));

    const updatedScene = await transaction.scene.update({
      where: {
        id: sceneId,
      },
      data: {
        locationId: location.id,
        latitude: input.latitude,
        longitude: input.longitude,
        mapsUrl: input.mapsUrl ?? null,
        notes: input.notes,
      },
      include: {
        work: true,
        location: true,
      },
    });

    return mapSceneCatalogItem(updatedScene);
  });
}

function mapSceneCatalogItem(scene: {
  id: string;
  sceneCode: string;
  episode: string | null;
  animeImageDriveFileId: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  notes: string | null;
  status: string;
  work: {
    id: string;
    name: string;
    shortCode: string;
  };
  location: {
    id: string;
    name: string;
    areaName: string | null;
  };
}): SceneCatalogItem {
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
