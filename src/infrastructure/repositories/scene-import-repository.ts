import {
  buildSceneImportPreview,
  parseSceneImportCsv,
  type SceneImportPreview,
} from "@/application/scene-import";
import { prisma } from "@/infrastructure/database/prisma";

export interface SceneImportCommitResult {
  ok: boolean;
  preview: SceneImportPreview;
  createdCount: number;
  updatedCount: number;
  sceneCodes: string[];
}

export async function previewSceneImportCsv(
  csvText: string,
): Promise<SceneImportPreview> {
  const parsed = parseSceneImportCsv(csvText);
  const existingSceneCodes = await prisma.scene.findMany({
    select: {
      sceneCode: true,
    },
  });

  return buildSceneImportPreview(
    parsed.rows,
    existingSceneCodes.map((scene) => scene.sceneCode),
    parsed.errors,
  );
}

export async function commitSceneImportCsv(
  csvText: string,
): Promise<SceneImportCommitResult> {
  const preview = await previewSceneImportCsv(csvText);

  if (!preview.canCommit) {
    return {
      ok: false,
      preview,
      createdCount: 0,
      updatedCount: 0,
      sceneCodes: [],
    };
  }

  const result = await prisma.$transaction(async (transaction) => {
    for (const row of preview.rows) {
      const work = await transaction.work.upsert({
        where: {
          shortCode: row.workShortCode,
        },
        create: {
          name: row.workName,
          shortCode: row.workShortCode,
        },
        update: {
          name: row.workName,
        },
      });

      const location = await transaction.location.upsert({
        where: {
          name_areaName: {
            name: row.locationName,
            areaName: row.areaName,
          },
        },
        create: {
          name: row.locationName,
          areaName: row.areaName,
          latitude: row.latitude,
          longitude: row.longitude,
          mapsUrl: row.mapsUrl ?? null,
        },
        update: {
          latitude: row.latitude,
          longitude: row.longitude,
          mapsUrl: row.mapsUrl ?? null,
        },
      });

      await transaction.scene.upsert({
        where: {
          sceneCode: row.sceneCode,
        },
        create: {
          sceneCode: row.sceneCode,
          workId: work.id,
          episode: row.episode ?? null,
          animeImageDriveFileId: row.animeImageDriveFileId,
          locationId: location.id,
          latitude: row.latitude,
          longitude: row.longitude,
          mapsUrl: row.mapsUrl ?? null,
          notes: row.notes ?? null,
          status: "NOT_SHOT",
        },
        update: {
          workId: work.id,
          episode: row.episode ?? null,
          animeImageDriveFileId: row.animeImageDriveFileId,
          locationId: location.id,
          latitude: row.latitude,
          longitude: row.longitude,
          mapsUrl: row.mapsUrl ?? null,
          notes: row.notes ?? null,
        },
      });
    }

    return {
      createdCount: preview.summary.createCount,
      updatedCount: preview.summary.updateCount,
      sceneCodes: preview.rows.map((row) => row.sceneCode),
    };
  });

  return {
    ok: true,
    preview,
    ...result,
  };
}
