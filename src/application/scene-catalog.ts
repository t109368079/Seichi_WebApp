import { type SceneStatus, isSceneStatus, sceneStatuses } from "@/domain/scene";

export interface SceneCatalogItem {
  id: string;
  sceneCode: string;
  episode?: string;
  animeImageDriveFileId: string;
  latitude: number;
  longitude: number;
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
