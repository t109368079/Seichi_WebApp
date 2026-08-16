import { describe, expect, it } from "vitest";
import {
  countDistinctWorksAtLocation,
  filterSceneCatalogItems,
  getSceneStatusLabel,
  normalizeSceneCreateInput,
  normalizeSceneEditableFields,
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

describe("scene catalog editable fields", () => {
  it("normalizes location, coordinates, and map URL edits", () => {
    expect(
      normalizeSceneEditableFields({
        locationName: "  New Station Gate  ",
        areaName: "  Ikebukuro  ",
        latitude: "35.73028",
        longitude: "139.71145",
        mapsUrl: " https://maps.google.com/?q=35.73028,139.71145 ",
      }),
    ).toEqual({
      locationName: "New Station Gate",
      areaName: "Ikebukuro",
      latitude: 35.73028,
      longitude: 139.71145,
      mapsUrl: "https://maps.google.com/?q=35.73028,139.71145",
    });
  });

  it("allows a map URL without coordinates", () => {
    expect(
      normalizeSceneEditableFields({
        locationName: "URL Only Place",
        areaName: "",
        latitude: "",
        longitude: "",
        mapsUrl: "https://maps.app.goo.gl/example",
      }),
    ).toEqual({
      locationName: "URL Only Place",
      areaName: undefined,
      latitude: null,
      longitude: null,
      mapsUrl: "https://maps.app.goo.gl/example",
    });
  });

  it("rejects incomplete or missing navigation references", () => {
    expect(() =>
      normalizeSceneEditableFields({
        locationName: "",
        areaName: "",
        latitude: "35.73028",
        longitude: "139.71145",
        mapsUrl: "",
      }),
    ).toThrow("Scene location name is required.");

    expect(() =>
      normalizeSceneEditableFields({
        locationName: "Partial Coordinate Place",
        areaName: "",
        latitude: "35.73028",
        longitude: "",
        mapsUrl: "",
      }),
    ).toThrow("Scene latitude and longitude must be provided together.");

    expect(() =>
      normalizeSceneEditableFields({
        locationName: "Invalid Latitude Place",
        areaName: "",
        latitude: "91",
        longitude: "139.71145",
        mapsUrl: "",
      }),
    ).toThrow("Invalid latitude: 91");

    expect(() =>
      normalizeSceneEditableFields({
        locationName: "Missing Navigation Place",
        areaName: "",
        latitude: "",
        longitude: "",
        mapsUrl: "",
      }),
    ).toThrow("Scene requires either coordinates or mapsUrl.");
  });
});

describe("scene catalog create form", () => {
  it("normalizes required scene creation fields and optional text", () => {
    expect(
      normalizeSceneCreateInput({
        sceneCode: " manual-001 ",
        workName: " Manual Work ",
        workShortCode: " mw ",
        episode: " 03 ",
        animeImageDriveFileId: " manual-drive-file ",
        locationName: " Manual Station ",
        areaName: " Manual Area ",
        latitude: "35.1",
        longitude: "139.2",
        mapsUrl: "",
        notes: " Framing note ",
      }),
    ).toEqual({
      sceneCode: "MANUAL-001",
      workName: "Manual Work",
      workShortCode: "MW",
      episode: "03",
      animeImageDriveFileId: "manual-drive-file",
      locationName: "Manual Station",
      areaName: "Manual Area",
      latitude: 35.1,
      longitude: 139.2,
      mapsUrl: undefined,
      notes: "Framing note",
    });
  });

  it("rejects missing required scene creation fields", () => {
    const validInput = {
      sceneCode: "MANUAL-001",
      workName: "Manual Work",
      workShortCode: "MW",
      episode: "",
      animeImageDriveFileId: "manual-drive-file",
      locationName: "Manual Station",
      areaName: "Manual Area",
      latitude: "",
      longitude: "",
      mapsUrl: "https://maps.google.com/?q=35.1,139.2",
      notes: "",
    };

    expect(() =>
      normalizeSceneCreateInput({
        ...validInput,
        sceneCode: "",
      }),
    ).toThrow("Scene sceneCode is required.");

    expect(() =>
      normalizeSceneCreateInput({
        ...validInput,
        workName: "",
      }),
    ).toThrow("Scene work name is required.");

    expect(() =>
      normalizeSceneCreateInput({
        ...validInput,
        areaName: "",
      }),
    ).toThrow("Scene area name is required.");
  });

  it("requires either paired coordinates or a map URL for new scenes", () => {
    const validInput = {
      sceneCode: "MANUAL-001",
      workName: "Manual Work",
      workShortCode: "MW",
      episode: "",
      animeImageDriveFileId: "manual-drive-file",
      locationName: "Manual Station",
      areaName: "Manual Area",
      latitude: "",
      longitude: "",
      mapsUrl: "",
      notes: "",
    };

    expect(() => normalizeSceneCreateInput(validInput)).toThrow(
      "Scene requires either coordinates or mapsUrl.",
    );

    expect(() =>
      normalizeSceneCreateInput({
        ...validInput,
        latitude: "35.1",
      }),
    ).toThrow("Scene latitude and longitude must be provided together.");
  });
});
