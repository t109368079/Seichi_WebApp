import { describe, expect, it } from "vitest";
import {
  buildGoogleMapsNavigationUrl,
  distanceMeters,
  filterSceneMapItems,
  getCoordinateIssue,
  getNavigationTarget,
  groupSceneMapMarkers,
  hasValidMapCoordinates,
  projectCoordinate,
} from "@/application/scene-map";
import type { SceneCatalogItem } from "@/application/scene-catalog";

const scenes = [
  scene({
    id: "scene-bhc-001",
    sceneCode: "BHC-001",
    latitude: 35.73028,
    longitude: 139.71145,
    status: "NOT_SHOT",
    workId: "work-blue-hour-crossing",
    workName: "Blue Hour Crossing",
    workShortCode: "BHC",
    locationId: "location-ikebukuro-east-gate",
    locationName: "Ikebukuro Station East Gate",
    areaName: "Ikebukuro",
  }),
  scene({
    id: "scene-slc-001",
    sceneCode: "SLC-001",
    latitude: 35.73028,
    longitude: 139.71145,
    status: "PENDING_REVIEW",
    workId: "work-station-lights-chronicle",
    workName: "Station Lights Chronicle",
    workShortCode: "SLC",
    locationId: "location-ikebukuro-east-gate",
    locationName: "Ikebukuro Station East Gate",
    areaName: "Ikebukuro",
  }),
  scene({
    id: "scene-near-001",
    sceneCode: "NEAR-001",
    latitude: 35.7303,
    longitude: 139.7115,
    status: "REVIEWED",
    workId: "work-blue-hour-crossing",
    workName: "Blue Hour Crossing",
    workShortCode: "BHC",
    locationId: "location-near-east-gate",
    locationName: "Near East Gate",
    areaName: "Ikebukuro",
  }),
  scene({
    id: "scene-ars-004",
    sceneCode: "ARS-004",
    latitude: 35.71987,
    longitude: 139.72754,
    status: "NOT_SHOT",
    workId: "work-after-rain-storyboard",
    workName: "After Rain Storyboard",
    workShortCode: "ARS",
    locationId: "location-gokokuji-slope",
    locationName: "Gokokuji Slope",
    areaName: "Otsuka",
  }),
] as const satisfies readonly SceneCatalogItem[];

describe("scene map coordinates and navigation", () => {
  it("generates Google Maps navigation URLs from valid coordinates", () => {
    expect(
      buildGoogleMapsNavigationUrl({
        latitude: 35.73028,
        longitude: 139.71145,
      }),
    ).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=35.73028,139.71145",
    );
    expect(
      getNavigationTarget({ latitude: 35.73028, longitude: 139.71145 }),
    ).toEqual({
      href: "https://www.google.com/maps/dir/?api=1&destination=35.73028,139.71145",
    });
  });

  it("reports missing and invalid coordinates without generating URLs", () => {
    expect(hasValidMapCoordinates({ latitude: null, longitude: 139 })).toBe(
      false,
    );
    expect(getCoordinateIssue({ latitude: null, longitude: 139 })).toBe(
      "Coordinates are missing.",
    );
    expect(getCoordinateIssue({ latitude: 91, longitude: 139 })).toBe(
      "Invalid latitude: 91",
    );
    expect(getNavigationTarget({ latitude: 35, longitude: 181 })).toEqual({
      disabledReason: "Invalid longitude: 181",
    });
  });
});

describe("scene map grouping and projection", () => {
  it("groups same and nearby coordinates while preserving scene identity", () => {
    const groups = groupSceneMapMarkers(scenes, 35);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.sceneCount).toBe(3);
    expect(groups[0]?.label).toBe("Ikebukuro nearby scenes");
    expect(groups[0]?.scenes.map((mapScene) => mapScene.sceneCode)).toEqual([
      "BHC-001",
      "SLC-001",
      "NEAR-001",
    ]);
    expect(groups[1]?.sceneCount).toBe(1);
    expect(groups[1]?.label).toBe("Gokokuji Slope");
  });

  it("keeps projected marker positions inside the map bounds", () => {
    const groups = groupSceneMapMarkers(scenes);

    for (const group of groups) {
      expect(group.xPercent).toBeGreaterThanOrEqual(0);
      expect(group.xPercent).toBeLessThanOrEqual(100);
      expect(group.yPercent).toBeGreaterThanOrEqual(0);
      expect(group.yPercent).toBeLessThanOrEqual(100);
    }

    expect(
      projectCoordinate({ latitude: 35, longitude: 139 }, undefined),
    ).toEqual({
      xPercent: 50,
      yPercent: 50,
    });
  });

  it("uses meter distance for grouping thresholds", () => {
    expect(distanceMeters(scenes[0], scenes[2])).toBeLessThan(6);
    expect(distanceMeters(scenes[0], scenes[3])).toBeGreaterThan(1500);
  });
});

describe("scene map filtering", () => {
  it("matches catalog filter behavior for work, location, and status", () => {
    expect(
      filterSceneMapItems(scenes, {
        workId: "work-blue-hour-crossing",
      }).map((mapScene) => mapScene.sceneCode),
    ).toEqual(["BHC-001", "NEAR-001"]);

    expect(
      filterSceneMapItems(scenes, {
        locationId: "location-ikebukuro-east-gate",
      }).map((mapScene) => mapScene.sceneCode),
    ).toEqual(["BHC-001", "SLC-001"]);

    expect(
      filterSceneMapItems(scenes, {
        status: "REVIEWED",
      }).map((mapScene) => mapScene.sceneCode),
    ).toEqual(["NEAR-001"]);
  });
});

function scene(input: {
  id: string;
  sceneCode: string;
  latitude: number;
  longitude: number;
  status: SceneCatalogItem["status"];
  workId: string;
  workName: string;
  workShortCode: string;
  locationId: string;
  locationName: string;
  areaName: string;
}): SceneCatalogItem {
  return {
    id: input.id,
    sceneCode: input.sceneCode,
    episode: "01",
    animeImageDriveFileId: `demo-drive-${input.sceneCode.toLowerCase()}`,
    latitude: input.latitude,
    longitude: input.longitude,
    status: input.status,
    work: {
      id: input.workId,
      name: input.workName,
      shortCode: input.workShortCode,
    },
    location: {
      id: input.locationId,
      name: input.locationName,
      areaName: input.areaName,
    },
  };
}
