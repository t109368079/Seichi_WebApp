import {
  assertSceneNavigationReference,
  assertValidCoordinates,
  type SceneStatus,
  isSceneStatus,
  sceneStatuses,
} from "@/domain/scene";

export interface SceneCatalogItem {
  id: string;
  sceneCode: string;
  episode?: string;
  animeImageDriveFileId: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl?: string;
  notes?: string;
  status: SceneStatus;
  work: {
    id: string;
    name: string;
    shortCode: string;
  };
  location: {
    id: string;
    name: string;
    areaName?: string;
  };
}

export interface SceneCatalogFilters {
  workId?: string;
  locationId?: string;
  status?: SceneStatus;
}

export interface SceneCatalogFilterOptions {
  workIds: readonly string[];
  locationIds: readonly string[];
}

export interface SceneEditableFieldsFormInput {
  locationName: string;
  areaName: string;
  latitude: string;
  longitude: string;
  mapsUrl: string;
}

export interface SceneCreateFormInput {
  sceneCode: string;
  workName: string;
  workShortCode: string;
  episode: string;
  animeImageDriveFileId: string;
  locationName: string;
  areaName: string;
  latitude: string;
  longitude: string;
  mapsUrl: string;
  notes: string;
}

export interface SceneEditableFieldsUpdate {
  locationName: string;
  areaName?: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl?: string;
}

export interface SceneCreateInput {
  sceneCode: string;
  workName: string;
  workShortCode: string;
  episode?: string;
  animeImageDriveFileId: string;
  locationName: string;
  areaName: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl?: string;
  notes?: string;
}

export function normalizeSceneEditableFields(
  input: SceneEditableFieldsFormInput,
): SceneEditableFieldsUpdate {
  const locationName = input.locationName.trim();

  if (locationName.length === 0) {
    throw new Error("Scene location name is required.");
  }

  const areaName = input.areaName.trim() || undefined;
  const navigation = normalizeSceneNavigationFields(input);

  return {
    locationName,
    areaName,
    ...navigation,
  };
}

export function normalizeSceneCreateInput(
  input: SceneCreateFormInput,
): SceneCreateInput {
  const sceneCode = normalizeIdentifier(input.sceneCode);
  const workName = input.workName.trim();
  const workShortCode = normalizeIdentifier(input.workShortCode);
  const animeImageDriveFileId = input.animeImageDriveFileId.trim();
  const locationName = input.locationName.trim();
  const areaName = input.areaName.trim();

  if (sceneCode.length === 0) {
    throw new Error("Scene sceneCode is required.");
  }

  if (workName.length === 0) {
    throw new Error("Scene work name is required.");
  }

  if (workShortCode.length === 0) {
    throw new Error("Scene work short code is required.");
  }

  if (animeImageDriveFileId.length === 0) {
    throw new Error("Scene anime image Drive file id is required.");
  }

  if (locationName.length === 0) {
    throw new Error("Scene location name is required.");
  }

  if (areaName.length === 0) {
    throw new Error("Scene area name is required.");
  }

  return {
    sceneCode,
    workName,
    workShortCode,
    episode: input.episode.trim() || undefined,
    animeImageDriveFileId,
    locationName,
    areaName,
    ...normalizeSceneNavigationFields(input),
    notes: input.notes.trim() || undefined,
  };
}

export function normalizeSceneCatalogFilters(
  rawFilters: Record<string, string | undefined>,
  options: SceneCatalogFilterOptions,
): SceneCatalogFilters {
  const filters: SceneCatalogFilters = {};

  if (rawFilters.workId && options.workIds.includes(rawFilters.workId)) {
    filters.workId = rawFilters.workId;
  }

  if (
    rawFilters.locationId &&
    options.locationIds.includes(rawFilters.locationId)
  ) {
    filters.locationId = rawFilters.locationId;
  }

  if (rawFilters.status && isSceneStatus(rawFilters.status)) {
    filters.status = rawFilters.status;
  }

  return filters;
}

export function filterSceneCatalogItems(
  scenes: readonly SceneCatalogItem[],
  filters: SceneCatalogFilters,
): SceneCatalogItem[] {
  return scenes.filter((scene) => {
    if (filters.workId && scene.work.id !== filters.workId) {
      return false;
    }

    if (filters.locationId && scene.location.id !== filters.locationId) {
      return false;
    }

    if (filters.status && scene.status !== filters.status) {
      return false;
    }

    return true;
  });
}

export function countDistinctWorksAtLocation(
  scenes: readonly SceneCatalogItem[],
  locationId: string,
): number {
  return new Set(
    scenes
      .filter((scene) => scene.location.id === locationId)
      .map((scene) => scene.work.id),
  ).size;
}

export function getSceneStatusLabel(status: SceneStatus): string {
  const labels = {
    NOT_SHOT: "未拍攝",
    PENDING_REVIEW: "待確認",
    REVIEWED: "已審核",
    RETAKE_REQUIRED: "需要補拍",
    SKIPPED: "已略過",
  } satisfies Record<SceneStatus, string>;

  return labels[status];
}

export function getSceneStatusOptions(): readonly SceneStatus[] {
  return sceneStatuses;
}

export function formatSceneCoordinates(
  scene: Pick<SceneCatalogItem, "latitude" | "longitude">,
): string {
  if (
    typeof scene.latitude === "number" &&
    typeof scene.longitude === "number"
  ) {
    return `${scene.latitude.toFixed(5)}, ${scene.longitude.toFixed(5)}`;
  }

  return "未設定";
}

function normalizeSceneNavigationFields(input: {
  latitude: string;
  longitude: string;
  mapsUrl: string;
}): Pick<SceneCreateInput, "latitude" | "longitude" | "mapsUrl"> {
  const latitudeText = input.latitude.trim();
  const longitudeText = input.longitude.trim();
  const mapsUrl = input.mapsUrl.trim() || undefined;
  const hasLatitude = latitudeText.length > 0;
  const hasLongitude = longitudeText.length > 0;
  let latitude: number | null = null;
  let longitude: number | null = null;

  if (hasLatitude || hasLongitude) {
    if (!hasLatitude || !hasLongitude) {
      throw new Error(
        "Scene latitude and longitude must be provided together.",
      );
    }

    latitude = Number(latitudeText);
    longitude = Number(longitudeText);
    assertValidCoordinates({
      latitude,
      longitude,
    });
  }

  assertSceneNavigationReference({
    latitude,
    longitude,
    mapsUrl,
  });

  return {
    latitude,
    longitude,
    mapsUrl,
  };
}

function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase();
}
