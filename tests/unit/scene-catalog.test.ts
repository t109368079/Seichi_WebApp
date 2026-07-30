import { describe, expect, it } from "vitest";
import {
  countDistinctWorksAtLocation,
  filterSceneCatalogItems,
  getSceneStatusLabel,
  normalizeSceneCatalogFilters,
  type SceneCatalogItem,
} from "@/application/scene-catalog";

const scenes = [
  {
    id: "scene-bhc-001",
    sceneCode: "BHC-001",
    animeImageDriveFileId: "demo-drive-bhc-001",
    latitude: 35.73028,
    longitude: 139.71145,
    status: "NOT_SHOT",
    work: {
      id: "work-blue-hour-crossing",
      name: "Blue Hour Crossing",
      shortCode: "BHC",
    },
    location: {
      id: "location-ikebukuro-east-gate",
      name: "Ikebukuro Station East Gate",
      areaName: "Ikebukuro",
    },
  },
  {
    id: "scene-slc-001",
    sceneCode: "SLC-001",
    animeImageDriveFileId: "demo-drive-slc-001",
    latitude: 35.73028,
    longitude: 139.71145,
    status: "PENDING_REVIEW",
    work: {
      id: "work-station-lights-chronicle",
      name: "Station Lights Chronicle",
      shortCode: "SLC",
    },
    location: {
      id: "location-ikebukuro-east-gate",
      name: "Ikebukuro Station East Gate",
      areaName: "Ikebukuro",
    },
  },
  {
    id: "scene-bhc-002",
    sceneCode: "BHC-002",
    animeImageDriveFileId: "demo-drive-bhc-002",
    latitude: 35.72905,
    longitude: 139.71672,
    status: "RETAKE_REQUIRED",
    work: {
      id: "work-blue-hour-crossing",
      name: "Blue Hour Crossing",
      shortCode: "BHC",
    },
    location: {
      id: "location-sunshine-street-crossing",
      name: "Sunshine Street Crossing",
      areaName: "Ikebukuro",
    },
  },
] as const satisfies readonly SceneCatalogItem[];

describe("scene catalog filtering", () => {
  it("filters scenes by work, location, and status", () => {
    expect(
      filterSceneCatalogItems(scenes, {
        workId: "work-blue-hour-crossing",
      }).map((scene) => scene.sceneCode),
    ).toEqual(["BHC-001", "BHC-002"]);

    expect(
      filterSceneCatalogItems(scenes, {
        locationId: "location-ikebukuro-east-gate",
      }).map((scene) => scene.sceneCode),
    ).toEqual(["BHC-001", "SLC-001"]);

    expect(
      filterSceneCatalogItems(scenes, {
        status: "RETAKE_REQUIRED",
      }).map((scene) => scene.sceneCode),
    ).toEqual(["BHC-002"]);
  });

  it("normalizes URL filters against known options", () => {
    expect(
      normalizeSceneCatalogFilters(
        {
          workId: "work-blue-hour-crossing",
          locationId: "location-ikebukuro-east-gate",
          status: "PENDING_REVIEW",
        },
        {
          workIds: ["work-blue-hour-crossing"],
          locationIds: ["location-ikebukuro-east-gate"],
        },
      ),
    ).toEqual({
      workId: "work-blue-hour-crossing",
      locationId: "location-ikebukuro-east-gate",
      status: "PENDING_REVIEW",
    });

    expect(
      normalizeSceneCatalogFilters(
        {
          workId: "unknown-work",
          locationId: "unknown-location",
          status: "DONE",
        },
        {
          workIds: ["work-blue-hour-crossing"],
          locationIds: ["location-ikebukuro-east-gate"],
        },
      ),
    ).toEqual({});
  });

  it("keeps cross-work same-location scenes visible as separate scene identities", () => {
    expect(
      countDistinctWorksAtLocation(scenes, "location-ikebukuro-east-gate"),
    ).toBe(2);
    expect(getSceneStatusLabel("PENDING_REVIEW")).toBe("待確認");
  });
});
