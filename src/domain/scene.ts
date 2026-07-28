export const sceneStatuses = [
  "NOT_SHOT",
  "PENDING_REVIEW",
  "REVIEWED",
  "RETAKE_REQUIRED",
  "SKIPPED",
] as const;

export type SceneStatus = (typeof sceneStatuses)[number];

export interface Work {
  id: string;
  name: string;
  shortCode: string;
  description?: string;
}

export interface Location {
  id: string;
  name: string;
  areaName?: string;
  latitude: number;
  longitude: number;
  mapsUrl?: string;
}

export interface Scene {
  id: string;
  sceneCode: string;
  workId: string;
  episode?: string;
  animeImageDriveFileId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  mapsUrl?: string;
  notes?: string;
  status: SceneStatus;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function isSceneStatus(value: string): value is SceneStatus {
  return sceneStatuses.includes(value as SceneStatus);
}

export function assertSceneStatus(value: string): SceneStatus {
  if (!isSceneStatus(value)) {
    throw new Error(`Invalid SceneStatus: ${value}`);
  }

  return value;
}

export function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function assertValidCoordinates(coordinates: Coordinates): Coordinates {
  if (!isValidLatitude(coordinates.latitude)) {
    throw new Error(`Invalid latitude: ${coordinates.latitude}`);
  }

  if (!isValidLongitude(coordinates.longitude)) {
    throw new Error(`Invalid longitude: ${coordinates.longitude}`);
  }

  return coordinates;
}

export function findDuplicateSceneCodes(
  scenes: readonly Pick<Scene, "sceneCode">[],
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const scene of scenes) {
    if (seen.has(scene.sceneCode)) {
      duplicates.add(scene.sceneCode);
    }

    seen.add(scene.sceneCode);
  }

  return [...duplicates].sort();
}

export function assertUniqueSceneCodes(
  scenes: readonly Pick<Scene, "sceneCode">[],
): void {
  const duplicates = findDuplicateSceneCodes(scenes);

  if (duplicates.length > 0) {
    throw new Error(`Duplicate sceneCode values: ${duplicates.join(", ")}`);
  }
}

export function createScene(input: Scene): Scene {
  if (input.sceneCode.trim().length === 0) {
    throw new Error("Scene sceneCode is required.");
  }

  if (input.id.trim().length === 0) {
    throw new Error("Scene id is required.");
  }

  assertSceneStatus(input.status);
  assertValidCoordinates({
    latitude: input.latitude,
    longitude: input.longitude,
  });

  return input;
}
