import { describe, expect, it } from "vitest";
import {
  buildSceneImportPreview,
  parseSceneImportCsv,
} from "@/application/scene-import";

const csvHeader =
  "scene_code,work_name,work_short_code,episode,anime_drive_file_id,location_name,area_name,latitude,longitude,maps_url,notes";

describe("scene import CSV parsing", () => {
  it("parses and normalizes valid CSV rows", () => {
    const csv = `${csvHeader}
"nri-101","Night Rail Ikebukuro",nri,03,demo-drive-nri-101,"East Gate, Main",Ikebukuro,35.73028,139.71145,"https://maps.google.com/?q=35.73028,139.71145","Quoted ""note"" with comma, ok"`;

    const result = parseSceneImportCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        sceneCode: "NRI-101",
        workName: "Night Rail Ikebukuro",
        workShortCode: "NRI",
        episode: "03",
        animeImageDriveFileId: "demo-drive-nri-101",
        locationName: "East Gate, Main",
        areaName: "Ikebukuro",
        latitude: 35.73028,
        longitude: 139.71145,
        mapsUrl: "https://maps.google.com/?q=35.73028,139.71145",
        notes: 'Quoted "note" with comma, ok',
      },
    ]);
  });

  it("reports missing, unknown, and duplicate headers", () => {
    const result = parseSceneImportCsv(
      "scene_code,work_name,work_short_code,episode,anime_drive_file_id,location_name,area_name,latitude,maps_url,notes,notes,status\nNRI-101,Night Rail,NRI,03,demo-drive,East Gate,Ikebukuro,35.73028,,note,note,NOT_SHOT",
    );

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 1,
          field: "longitude",
          message: "缺少 CSV 欄位：longitude。",
        }),
        expect.objectContaining({
          rowNumber: 1,
          field: "notes",
          message: "重複的 CSV 欄位：notes。",
        }),
        expect.objectContaining({
          rowNumber: 1,
          field: "status",
          message: "未知的 CSV 欄位：status。",
        }),
      ]),
    );
  });

  it("reports empty required values with CSV row numbers", () => {
    const result = parseSceneImportCsv(
      `${csvHeader}
,Night Rail,NRI,03,demo-drive,East Gate,Ikebukuro,35.73028,139.71145,,`,
    );

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        field: "scene_code",
        message: "scene_code 為必填欄位，不能空白。",
      },
    ]);
  });

  it("reports duplicate scene codes inside the CSV", () => {
    const result = parseSceneImportCsv(
      `${csvHeader}
NRI-101,Night Rail,NRI,03,demo-drive-1,East Gate,Ikebukuro,35.73028,139.71145,,
nri-101,Night Rail,NRI,03,demo-drive-2,West Gate,Ikebukuro,35.73100,139.71200,,`,
    );

    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: "scene_code",
        message: "scene_code NRI-101 重複；第一次出現在第 2 列。",
      },
    ]);
  });

  it("reports invalid coordinates with field and line number", () => {
    const result = parseSceneImportCsv(
      `${csvHeader}
NRI-101,Night Rail,NRI,03,demo-drive-1,East Gate,Ikebukuro,35.73028,139.71145,,
NRI-102,Night Rail,NRI,03,demo-drive-2,West Gate,Ikebukuro,35.73100,181,,`,
    );

    expect(result.rows.map((row) => row.sceneCode)).toEqual(["NRI-101"]);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        field: "longitude",
        message: "經度無效：181",
      },
    ]);
  });
});

describe("scene import preview", () => {
  it("calculates create and update counts from existing scene codes", () => {
    const parsed = parseSceneImportCsv(
      `${csvHeader}
BHC-001,Blue Hour Crossing,BHC,01,demo-drive-bhc-001,East Gate,Ikebukuro,35.73028,139.71145,,
NRI-101,Night Rail,NRI,03,demo-drive-nri-101,North Exit,Otsuka,35.73102,139.72824,,`,
    );

    const preview = buildSceneImportPreview(parsed.rows, ["BHC-001"]);

    expect(preview.canCommit).toBe(true);
    expect(preview.summary).toEqual({
      totalRows: 2,
      createCount: 1,
      updateCount: 1,
      errorCount: 0,
    });
    expect(preview.rows.map((row) => [row.sceneCode, row.action])).toEqual([
      ["BHC-001", "update"],
      ["NRI-101", "create"],
    ]);
  });
});
