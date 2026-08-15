import { describe, expect, it } from "vitest";
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsNavigationUrl,
  distanceMeters,
  filterSceneMapItems,
  getCoordinateIssue,
  getNavigationTarget,
  getPreferredMapCoordinates,
  groupSceneMapMarkers,
  hasMappableMapReference,
  hasValidMapCoordinates,
  parseGoogleMapsUrlCoordinates,
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
    expect(
      getNavigationTarget({
        latitude: 35.73028,
        longitude: 139.71145,
        mapsUrl: "https://maps.app.goo.gl/example",
      }),
    ).toEqual({
      href: "https://maps.app.goo.gl/example",
    });
    expect(
      getNavigationTarget({
        latitude: null,
        longitude: null,
        mapsUrl: "https://maps.app.goo.gl/example",
      }),
    ).toEqual({
      href: "https://maps.app.goo.gl/example",
    });
    expect(
      getNavigationTarget({
        latitude: null,
        longitude: null,
        mapsUrl: "Tokyo Station",
      }),
    ).toEqual({
      href: "https://www.google.com/maps/search/?api=1&query=Tokyo%20Station",
    });
    expect(
      buildGoogleMapsNavigationUrl({
        latitude: 35,
        longitude: 139,
        mapsUrl: "https://maps.google.com/?q=35.73028,139.71145",
      }),
    ).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=35.73028,139.71145",
    );
  });

  it("generates Google Maps embed URLs for map rendering", () => {
    expect(
      buildGoogleMapsEmbedUrl({
        latitude: 35.73028,
        longitude: 139.71145,
      }),
    ).toBe(
      "https://www.google.com/maps?q=35.73028%2C139.71145&z=16&output=embed",
    );

    expect(
      buildGoogleMapsEmbedUrl(
        {
          latitude: 35.73028,
          longitude: 139.71145,
        },
        { apiKey: "mock-maps-key" },
      ),
    ).toBe(
      "https://www.google.com/maps/embed/v1/view?key=mock-maps-key&center=35.73028%2C139.71145&zoom=16&maptype=roadmap&language=zh-TW",
    );

    expect(
      buildGoogleMapsEmbedUrl({
        latitude: 35,
        longitude: 139,
        mapsUrl: "https://maps.google.com/?q=35.73028,139.71145",
      }),
    ).toBe("https://maps.google.com/?q=35.73028%2C139.71145&output=embed");

    expect(
      buildGoogleMapsEmbedUrl(
        {
          latitude: 35,
          longitude: 139,
          mapsUrl: "https://maps.google.com/?q=35.73028,139.71145",
        },
        { apiKey: "mock-maps-key" },
      ),
    ).toBe(
      "https://www.google.com/maps/embed/v1/view?key=mock-maps-key&center=35.73028%2C139.71145&zoom=16&maptype=roadmap&language=zh-TW",
    );

    expect(
      buildGoogleMapsEmbedUrl({
        latitude: null,
        longitude: null,
        mapsUrl: "https://maps.app.goo.gl/example",
      }),
    ).toBe("https://maps.app.goo.gl/example");

    expect(
      buildGoogleMapsEmbedUrl({
        latitude: null,
        longitude: null,
        mapsUrl: "Tokyo Station",
      }),
    ).toBe("https://www.google.com/maps?q=Tokyo+Station&z=16&output=embed");

    expect(
      buildGoogleMapsEmbedUrl(
        {
          latitude: null,
          longitude: null,
          mapsUrl: "Tokyo Station",
        },
        { apiKey: "mock-maps-key" },
      ),
    ).toBe(
      "https://www.google.com/maps/embed/v1/place?key=mock-maps-key&q=Tokyo+Station&language=zh-TW",
    );

    expect(
      buildGoogleMapsEmbedUrl({
        latitude: null,
        longitude: 139.71145,
      }),
    ).toBeUndefined();
  });

  it("reads coordinates from common Google Maps URL formats", () => {
    expect(
      parseGoogleMapsUrlCoordinates(
        "https://www.google.com/maps/place/Tokyo/@35.681236,139.767125,17z",
      ),
    ).toEqual({
      latitude: 35.681236,
      longitude: 139.767125,
    });

    expect(
      parseGoogleMapsUrlCoordinates(
        "https://www.google.com/maps/search/?api=1&query=35.73028%2C139.71145",
      ),
    ).toEqual({
      latitude: 35.73028,
      longitude: 139.71145,
    });

    expect(
      parseGoogleMapsUrlCoordinates(
        "https://www.google.com/maps/place/Test/data=!3d35.71987!4d139.72754",
      ),
    ).toEqual({
      latitude: 35.71987,
      longitude: 139.72754,
    });

    expect(
      parseGoogleMapsUrlCoordinates("https://maps.app.goo.gl/example"),
    ).toBeUndefined();
  });

  it("reports missing and invalid coordinates without generating URLs", () => {
    expect(hasValidMapCoordinates({ latitude: null, longitude: 139 })).toBe(
      false,
    );
    expect(getCoordinateIssue({ latitude: null, longitude: 139 })).toBe(
      "座標缺失。",
    );
    expect(getCoordinateIssue({ latitude: 91, longitude: 139 })).toBe(
      "緯度無效：91",
    );
    expect(getNavigationTarget({ latitude: 35, longitude: 181 })).toEqual({
      disabledReason: "經度無效：181",
    });
  });
});

describe("scene map grouping and projection", () => {
  it("groups same and nearby coordinates while preserving scene identity", () => {
    const groups = groupSceneMapMarkers(scenes, 35);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.sceneCount).toBe(3);
    expect(groups[0]?.label).toBe("Ikebukuro 附近場景");
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
    const firstScene = scenes[0];
    const nearScene = scenes[2];
    const farScene = scenes[3];

    if (
      !firstScene ||
      !nearScene ||
      !farScene ||
      !hasValidMapCoordinates(firstScene) ||
      !hasValidMapCoordinates(nearScene) ||
      !hasValidMapCoordinates(farScene)
    ) {
      throw new Error("Map distance test scenes must have coordinates.");
    }

    expect(distanceMeters(firstScene, nearScene)).toBeLessThan(6);
    expect(distanceMeters(firstScene, farScene)).toBeGreaterThan(1500);
  });

  it("uses mapsUrl coordinates before explicit coordinates when grouping", () => {
    const groups = groupSceneMapMarkers([
      scenes[0],
      scene({
        id: "scene-url-coordinate",
        sceneCode: "URL-COORD-001",
        latitude: 35,
        longitude: 139,
        mapsUrl: "https://maps.google.com/?q=35.73029,139.71146",
        status: "NOT_SHOT",
        workId: "work-blue-hour-crossing",
        workName: "Blue Hour Crossing",
        workShortCode: "BHC",
        locationId: "location-url-coordinate",
        locationName: "URL Coordinate Place",
        areaName: "Ikebukuro",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.scenes.map((mapScene) => mapScene.sceneCode)).toEqual([
      "BHC-001",
      "URL-COORD-001",
    ]);
    expect(groups[0]?.latitude).toBeCloseTo(35.730285);
    expect(groups[0]?.longitude).toBeCloseTo(139.711455);
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

  it("includes URL-only scenes with embeddable Google Maps URLs or queries", () => {
    const result = filterSceneMapItems(
      [
        ...scenes,
        scene({
          id: "scene-url-only",
          sceneCode: "URL-001",
          latitude: null,
          longitude: null,
          mapsUrl: "https://maps.app.goo.gl/example",
          status: "NOT_SHOT",
          workId: "work-blue-hour-crossing",
          workName: "Blue Hour Crossing",
          workShortCode: "BHC",
          locationId: "location-url-only",
          locationName: "URL Only Place",
          areaName: "Ikebukuro",
        }),
        scene({
          id: "scene-non-google-url",
          sceneCode: "URL-002",
          latitude: null,
          longitude: null,
          mapsUrl: "https://example.com/not-google-maps",
          status: "NOT_SHOT",
          workId: "work-blue-hour-crossing",
          workName: "Blue Hour Crossing",
          workShortCode: "BHC",
          locationId: "location-non-google-url",
          locationName: "Non Google URL Place",
          areaName: "Ikebukuro",
        }),
        scene({
          id: "scene-map-query",
          sceneCode: "QUERY-001",
          latitude: null,
          longitude: null,
          mapsUrl: "Tokyo Station",
          status: "NOT_SHOT",
          workId: "work-blue-hour-crossing",
          workName: "Blue Hour Crossing",
          workShortCode: "BHC",
          locationId: "location-map-query",
          locationName: "Map Query Place",
          areaName: "Ikebukuro",
        }),
      ],
      {},
    );

    expect(result.map((mapScene) => mapScene.sceneCode)).toContain("URL-001");
    expect(result.map((mapScene) => mapScene.sceneCode)).toContain("QUERY-001");
    expect(result.map((mapScene) => mapScene.sceneCode)).not.toContain(
      "URL-002",
    );
    expect(
      hasMappableMapReference({
        latitude: null,
        longitude: null,
        mapsUrl: "https://maps.app.goo.gl/example",
      }),
    ).toBe(true);
    expect(
      hasMappableMapReference({
        latitude: null,
        longitude: null,
        mapsUrl: "Tokyo Station",
      }),
    ).toBe(true);
    expect(
      getPreferredMapCoordinates({
        latitude: 35,
        longitude: 139,
        mapsUrl: "https://maps.google.com/?q=35.73028,139.71145",
      }),
    ).toEqual({
      latitude: 35.73028,
      longitude: 139.71145,
    });
  });
});

function scene(input: {
  id: string;
  sceneCode: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl?: string;
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
    mapsUrl: input.mapsUrl,
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
