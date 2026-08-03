import { describe, expect, it } from "vitest";
import {
  assertSceneStatus,
  assertSceneNavigationReference,
  assertUniqueSceneCodes,
  assertValidCoordinates,
  createScene,
  findDuplicateSceneCodes,
  isSceneStatus,
} from "@/domain/scene";

describe("scene domain validation", () => {
  it("accepts only legal SceneStatus values", () => {
    expect(isSceneStatus("NOT_SHOT")).toBe(true);
    expect(isSceneStatus("PENDING_REVIEW")).toBe(true);
    expect(isSceneStatus("REVIEWED")).toBe(true);
    expect(isSceneStatus("RETAKE_REQUIRED")).toBe(true);
    expect(isSceneStatus("SKIPPED")).toBe(true);
    expect(isSceneStatus("DONE")).toBe(false);
    expect(() => assertSceneStatus("DONE")).toThrow("Invalid SceneStatus");
  });

  it("validates latitude and longitude ranges", () => {
    expect(() =>
      assertValidCoordinates({ latitude: 35.73, longitude: 139.72 }),
    ).not.toThrow();
    expect(() =>
      assertValidCoordinates({ latitude: 91, longitude: 139.72 }),
    ).toThrow("Invalid latitude");
    expect(() =>
      assertValidCoordinates({ latitude: 35.73, longitude: -181 }),
    ).toThrow("Invalid longitude");
  });

  it("accepts either coordinates or a maps URL as the navigation reference", () => {
    expect(() =>
      assertSceneNavigationReference({
        latitude: null,
        longitude: null,
        mapsUrl: "https://maps.app.goo.gl/example",
      }),
    ).not.toThrow();
    expect(() =>
      assertSceneNavigationReference({
        latitude: 35.73,
        longitude: 139.72,
      }),
    ).not.toThrow();
    expect(() =>
      assertSceneNavigationReference({
        latitude: null,
        longitude: null,
      }),
    ).toThrow("Scene requires either coordinates or mapsUrl.");
    expect(() =>
      assertSceneNavigationReference({
        latitude: 35.73,
        longitude: null,
        mapsUrl: "https://maps.app.goo.gl/example",
      }),
    ).toThrow("Scene latitude and longitude must be provided together.");
  });

  it("detects duplicate scene codes before database writes", () => {
    const scenes = [
      { sceneCode: "BHC-001" },
      { sceneCode: "SLC-001" },
      { sceneCode: "BHC-001" },
      { sceneCode: "ARS-001" },
      { sceneCode: "ARS-001" },
    ];

    expect(findDuplicateSceneCodes(scenes)).toEqual(["ARS-001", "BHC-001"]);
    expect(() => assertUniqueSceneCodes(scenes)).toThrow(
      "Duplicate sceneCode values: ARS-001, BHC-001",
    );
  });

  it("keeps scene identity separate from the anime image file id", () => {
    const scene = createScene({
      id: "scene-bhc-001",
      sceneCode: "BHC-001",
      workId: "work-blue-hour-crossing",
      episode: "01",
      animeImageDriveFileId: "demo-drive-bhc-001",
      locationId: "location-ikebukuro-east-gate",
      latitude: null,
      longitude: null,
      mapsUrl: "https://maps.app.goo.gl/example",
      status: "NOT_SHOT",
    });

    expect(scene.id).toBe("scene-bhc-001");
    expect(scene.sceneCode).toBe("BHC-001");
    expect(scene.animeImageDriveFileId).toBe("demo-drive-bhc-001");
  });
});
