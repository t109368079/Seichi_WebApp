import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { commitSceneImportCsv } from "@/infrastructure/repositories/scene-import-repository";
import { prisma } from "@/infrastructure/database/prisma";

const csvHeader =
  "scene_code,work_name,work_short_code,episode,anime_drive_file_id,location_name,area_name,latitude,longitude,maps_url,notes";

const importedSceneCodes = ["NRI-201", "NRI-202", "NRI-301", "NRI-302"];

let originalBhc002: {
  workId: string;
  episode: string | null;
  animeImageDriveFileId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  mapsUrl: string | null;
  notes: string | null;
  status:
    "NOT_SHOT" | "PENDING_REVIEW" | "REVIEWED" | "RETAKE_REQUIRED" | "SKIPPED";
};

beforeAll(async () => {
  await prisma.$connect();
  originalBhc002 = await prisma.scene.findUniqueOrThrow({
    where: {
      sceneCode: "BHC-002",
    },
    select: {
      workId: true,
      episode: true,
      animeImageDriveFileId: true,
      locationId: true,
      latitude: true,
      longitude: true,
      mapsUrl: true,
      notes: true,
      status: true,
    },
  });
});

afterEach(async () => {
  await prisma.scene.deleteMany({
    where: {
      sceneCode: {
        in: importedSceneCodes,
      },
    },
  });
  await prisma.scene.update({
    where: {
      sceneCode: "BHC-002",
    },
    data: originalBhc002,
  });
  await prisma.location.deleteMany({
    where: {
      OR: [
        {
          name: "Mejiro Bridge",
          areaName: "Mejiro",
        },
        {
          name: "Rollback Gate",
          areaName: "Ikebukuro",
        },
      ],
    },
  });
  await prisma.work.deleteMany({
    where: {
      shortCode: "NRI",
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("scene import repository", () => {
  it("imports a valid CSV and creates matching Work, Location, and Scene records", async () => {
    const result = await commitSceneImportCsv(
      csv([
        "NRI-201,Night Rail Ikebukuro,NRI,03,demo-drive-nri-201,Mejiro Bridge,Mejiro,35.72158,139.70622,,First angle",
        "NRI-202,Night Rail Ikebukuro,NRI,03,demo-drive-nri-202,Mejiro Bridge,Mejiro,35.72158,139.70622,,Second angle",
      ]),
    );

    const [work, location, scenes] = await Promise.all([
      prisma.work.findUnique({
        where: {
          shortCode: "NRI",
        },
      }),
      prisma.location.findUnique({
        where: {
          name_areaName: {
            name: "Mejiro Bridge",
            areaName: "Mejiro",
          },
        },
      }),
      prisma.scene.findMany({
        where: {
          sceneCode: {
            in: ["NRI-201", "NRI-202"],
          },
        },
        orderBy: {
          sceneCode: "asc",
        },
      }),
    ]);

    expect(result.ok).toBe(true);
    expect(result.createdCount).toBe(2);
    expect(result.updatedCount).toBe(0);
    expect(work?.name).toBe("Night Rail Ikebukuro");
    expect(location?.latitude).toBe(35.72158);
    expect(scenes.map((scene) => scene.status)).toEqual([
      "NOT_SHOT",
      "NOT_SHOT",
    ]);
    expect(new Set(scenes.map((scene) => scene.workId)).size).toBe(1);
    expect(new Set(scenes.map((scene) => scene.locationId)).size).toBe(1);
  });

  it("updates an existing Scene without changing its status", async () => {
    const result = await commitSceneImportCsv(
      csv([
        "BHC-002,Blue Hour Crossing,BHC,02,demo-drive-bhc-002-updated,Sunshine Street Crossing,Ikebukuro,35.72905,139.71672,,Updated by import",
      ]),
    );
    const scene = await prisma.scene.findUniqueOrThrow({
      where: {
        sceneCode: "BHC-002",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.createdCount).toBe(0);
    expect(result.updatedCount).toBe(1);
    expect(scene.status).toBe(originalBhc002.status);
    expect(scene.animeImageDriveFileId).toBe("demo-drive-bhc-002-updated");
    expect(scene.notes).toBe("Updated by import");
  });

  it("rejects an invalid CSV without writing valid rows from the same file", async () => {
    const result = await commitSceneImportCsv(
      csv([
        "NRI-301,Night Rail Ikebukuro,NRI,03,demo-drive-nri-301,Rollback Gate,Ikebukuro,35.73028,139.71145,,Valid row",
        "NRI-302,Night Rail Ikebukuro,NRI,03,demo-drive-nri-302,Rollback Gate,Ikebukuro,91,139.71145,,Invalid row",
      ]),
    );
    const createdCount = await prisma.scene.count({
      where: {
        sceneCode: {
          in: ["NRI-301", "NRI-302"],
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.preview.errors).toEqual([
      {
        rowNumber: 3,
        field: "latitude",
        message: "Invalid latitude: 91",
      },
    ]);
    expect(createdCount).toBe(0);
  });

  it("rejects mixed valid and invalid rows before the transaction starts", async () => {
    const result = await commitSceneImportCsv(
      csv([
        "NRI-301,Night Rail Ikebukuro,NRI,03,demo-drive-nri-301,Rollback Gate,Ikebukuro,35.73028,139.71145,,Valid row",
        "NRI-301,Night Rail Ikebukuro,NRI,03,demo-drive-nri-302,Rollback Gate,Ikebukuro,35.73029,139.71146,,Duplicate row",
      ]),
    );
    const createdCount = await prisma.scene.count({
      where: {
        sceneCode: "NRI-301",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.preview.errors).toEqual([
      {
        rowNumber: 3,
        field: "scene_code",
        message: "Duplicate scene_code NRI-301; first seen on row 2.",
      },
    ]);
    expect(createdCount).toBe(0);
  });
});

function csv(rows: readonly string[]): string {
  return `${csvHeader}\n${rows.join("\n")}`;
}
