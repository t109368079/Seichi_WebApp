import {
  buildSceneImportPreview,
  parseSceneImportCsv,
  parseSceneImportTable,
  type SceneImportPreview,
  type SceneImportRow,
} from "@/application/scene-import";
import {
  getGoogleAccessTokenForSession,
  getGoogleIntegrationSettings,
} from "@/infrastructure/repositories/google-integration-repository";
import { readSceneImportFromGoogleSheet } from "@/infrastructure/google/google-sheets";
import { prisma } from "@/infrastructure/database/prisma";

const sceneImportTransactionMaxWaitMs = 10_000;
const sceneImportTransactionTimeoutMs = 120_000;

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

  return previewSceneImportRows(parsed.rows, parsed.errors);
}

export async function previewSceneImportTable(
  values: readonly (readonly string[])[],
): Promise<SceneImportPreview> {
  const parsed = parseSceneImportTable(values);

  return previewSceneImportRows(parsed.rows, parsed.errors);
}

export async function previewSceneImportGoogleSheet(input: {
  googleSessionToken: string;
  sheetId?: string;
  sheetRange?: string;
}): Promise<SceneImportPreview> {
  const sheet = await resolveSheetInput(input.sheetId, input.sheetRange);
  const accessToken = await getGoogleAccessTokenForSession(
    input.googleSessionToken,
  );
  const parsed = await readSceneImportFromGoogleSheet({
    spreadsheetId: sheet.sheetId,
    range: sheet.sheetRange,
    accessToken,
  });

  return previewSceneImportRows(parsed.rows, parsed.errors);
}

async function previewSceneImportRows(
  rows: readonly SceneImportRow[],
  errors: SceneImportPreview["errors"],
): Promise<SceneImportPreview> {
  const existingSceneCodes = await prisma.scene.findMany({
    select: {
      sceneCode: true,
    },
  });

  return buildSceneImportPreview(
    rows,
    existingSceneCodes.map((scene) => scene.sceneCode),
    errors,
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

  const result = await commitSceneImportPreview(preview);

  return {
    ok: true,
    preview,
    ...result,
  };
}

export async function commitSceneImportGoogleSheet(input: {
  googleSessionToken: string;
  sheetId?: string;
  sheetRange?: string;
}): Promise<SceneImportCommitResult> {
  const preview = await previewSceneImportGoogleSheet(input);

  if (!preview.canCommit) {
    return {
      ok: false,
      preview,
      createdCount: 0,
      updatedCount: 0,
      sceneCodes: [],
    };
  }

  const result = await commitSceneImportPreview(preview);

  return {
    ok: true,
    preview,
    ...result,
  };
}

async function commitSceneImportPreview(preview: SceneImportPreview) {
  return prisma.$transaction(
    async (transaction) => {
      const workIdByShortCode = new Map<string, string>();
      const locationIdByKey = new Map<string, string>();
      const finalWorkNameByShortCode = new Map<string, string>();
      const finalLocationByKey = new Map<string, SceneImportRow>();

      for (const row of preview.rows) {
        finalWorkNameByShortCode.set(row.workShortCode, row.workName);
        finalLocationByKey.set(getLocationImportKey(row), row);
      }

      for (const row of preview.rows) {
        const workName = finalWorkNameByShortCode.get(row.workShortCode);

        const workId =
          workIdByShortCode.get(row.workShortCode) ??
          (
            await transaction.work.upsert({
              where: {
                shortCode: row.workShortCode,
              },
              create: {
                name: workName ?? row.workName,
                shortCode: row.workShortCode,
              },
              update: {
                name: workName ?? row.workName,
              },
            })
          ).id;
        workIdByShortCode.set(row.workShortCode, workId);

        const locationKey = getLocationImportKey(row);
        const locationSource = finalLocationByKey.get(locationKey) ?? row;
        const locationId =
          locationIdByKey.get(locationKey) ??
          (
            await transaction.location.upsert({
              where: {
                name_areaName: {
                  name: row.locationName,
                  areaName: row.areaName,
                },
              },
              create: {
                name: row.locationName,
                areaName: row.areaName,
                latitude: locationSource.latitude,
                longitude: locationSource.longitude,
                mapsUrl: locationSource.mapsUrl ?? null,
              },
              update: {
                latitude: locationSource.latitude,
                longitude: locationSource.longitude,
                mapsUrl: locationSource.mapsUrl ?? null,
              },
            })
          ).id;
        locationIdByKey.set(locationKey, locationId);

        await transaction.scene.upsert({
          where: {
            sceneCode: row.sceneCode,
          },
          create: {
            sceneCode: row.sceneCode,
            workId,
            episode: row.episode ?? null,
            animeImageDriveFileId: row.animeImageDriveFileId,
            locationId,
            latitude: row.latitude,
            longitude: row.longitude,
            mapsUrl: row.mapsUrl ?? null,
            notes: row.notes ?? null,
            status: "NOT_SHOT",
          },
          update: {
            workId,
            episode: row.episode ?? null,
            animeImageDriveFileId: row.animeImageDriveFileId,
            locationId,
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
    },
    {
      maxWait: sceneImportTransactionMaxWaitMs,
      timeout: sceneImportTransactionTimeoutMs,
    },
  );
}

async function resolveSheetInput(sheetId?: string, sheetRange?: string) {
  const settings = await getGoogleIntegrationSettings();

  return {
    sheetId: sheetId?.trim() || settings.sheetId,
    sheetRange: sheetRange?.trim() || settings.sheetRange,
  };
}

function getLocationImportKey(
  row: Pick<SceneImportRow, "locationName" | "areaName">,
) {
  return `${row.locationName}\u0000${row.areaName}`;
}
