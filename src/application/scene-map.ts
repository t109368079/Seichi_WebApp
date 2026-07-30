import {
  filterSceneCatalogItems,
  type SceneCatalogFilters,
  type SceneCatalogItem,
} from "@/application/scene-catalog";
import { isValidLatitude, isValidLongitude } from "@/domain/scene";

export const defaultMarkerGroupingRadiusMeters = 35;

export interface CoordinateLike {
  latitude?: number | null;
  longitude?: number | null;
}

export interface NavigationTarget {
  href?: string;
  disabledReason?: string;
}

export interface SceneMapMarkerGroup {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  xPercent: number;
  yPercent: number;
  sceneCount: number;
  scenes: SceneCatalogItem[];
}

interface MutableMarkerGroup {
  latitude: number;
  longitude: number;
  scenes: SceneCatalogItem[];
}

interface MapBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export function filterSceneMapItems(
  scenes: readonly SceneCatalogItem[],
  filters: SceneCatalogFilters,
): SceneCatalogItem[] {
  return filterSceneCatalogItems(scenes, filters).filter((scene) =>
    hasValidMapCoordinates(scene),
  );
}

export function hasValidMapCoordinates(
  coordinates: CoordinateLike,
): coordinates is { latitude: number; longitude: number } {
  return (
    typeof coordinates.latitude === "number" &&
    typeof coordinates.longitude === "number" &&
    isValidLatitude(coordinates.latitude) &&
    isValidLongitude(coordinates.longitude)
  );
}

export function getCoordinateIssue(
  coordinates: CoordinateLike,
): string | undefined {
  if (
    typeof coordinates.latitude !== "number" ||
    typeof coordinates.longitude !== "number"
  ) {
    return "座標缺失。";
  }

  if (!isValidLatitude(coordinates.latitude)) {
    return `緯度無效：${coordinates.latitude}`;
  }

  if (!isValidLongitude(coordinates.longitude)) {
    return `經度無效：${coordinates.longitude}`;
  }

  return undefined;
}

export function buildGoogleMapsNavigationUrl(
  coordinates: CoordinateLike,
): string | undefined {
  if (!hasValidMapCoordinates(coordinates)) {
    return undefined;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
}

export function getNavigationTarget(
  coordinates: CoordinateLike,
): NavigationTarget {
  const issue = getCoordinateIssue(coordinates);

  if (issue) {
    return {
      disabledReason: issue,
    };
  }

  return {
    href: buildGoogleMapsNavigationUrl(coordinates),
  };
}

export function groupSceneMapMarkers(
  scenes: readonly SceneCatalogItem[],
  radiusMeters = defaultMarkerGroupingRadiusMeters,
): SceneMapMarkerGroup[] {
  const groups: MutableMarkerGroup[] = [];

  for (const scene of sortScenesForMap(scenes)) {
    if (!hasValidMapCoordinates(scene)) {
      continue;
    }

    const existingGroup = groups.find(
      (group) => distanceMeters(group, scene) <= radiusMeters,
    );

    if (existingGroup) {
      existingGroup.scenes.push(scene);
      existingGroup.latitude = average(
        existingGroup.scenes.map((groupScene) => groupScene.latitude),
      );
      existingGroup.longitude = average(
        existingGroup.scenes.map((groupScene) => groupScene.longitude),
      );
    } else {
      groups.push({
        latitude: scene.latitude,
        longitude: scene.longitude,
        scenes: [scene],
      });
    }
  }

  const bounds = getMapBounds(groups);

  return groups.map((group, index) => {
    const projected = projectCoordinate(group, bounds);
    const sortedScenes = sortScenesForMap(group.scenes);

    return {
      id: `map-group-${index + 1}-${sortedScenes[0]?.sceneCode.toLowerCase() ?? "empty"}`,
      label: getMarkerGroupLabel(sortedScenes),
      latitude: group.latitude,
      longitude: group.longitude,
      xPercent: projected.xPercent,
      yPercent: projected.yPercent,
      sceneCount: sortedScenes.length,
      scenes: sortedScenes,
    };
  });
}

export function projectCoordinate(
  coordinates: { latitude: number; longitude: number },
  bounds: MapBounds | undefined,
): { xPercent: number; yPercent: number } {
  if (!bounds) {
    return {
      xPercent: 50,
      yPercent: 50,
    };
  }

  const paddingPercent = 8;
  const drawablePercent = 100 - paddingPercent * 2;
  const longitudeRange = bounds.maxLongitude - bounds.minLongitude;
  const latitudeRange = bounds.maxLatitude - bounds.minLatitude;
  const xRatio =
    longitudeRange === 0
      ? 0.5
      : (coordinates.longitude - bounds.minLongitude) / longitudeRange;
  const yRatio =
    latitudeRange === 0
      ? 0.5
      : (bounds.maxLatitude - coordinates.latitude) / latitudeRange;

  return {
    xPercent: clampPercent(paddingPercent + xRatio * drawablePercent),
    yPercent: clampPercent(paddingPercent + yRatio * drawablePercent),
  };
}

export function distanceMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLatitude = toRadians(second.latitude - first.latitude);
  const deltaLongitude = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function sortScenesForMap(
  scenes: readonly SceneCatalogItem[],
): SceneCatalogItem[] {
  return [...scenes].sort((first, second) => {
    const firstKey = [
      first.location.areaName ?? "",
      first.location.name,
      first.sceneCode,
    ].join("|");
    const secondKey = [
      second.location.areaName ?? "",
      second.location.name,
      second.sceneCode,
    ].join("|");

    return firstKey.localeCompare(secondKey);
  });
}

function getMapBounds(
  groups: readonly MutableMarkerGroup[],
): MapBounds | undefined {
  if (groups.length === 0) {
    return undefined;
  }

  return {
    minLatitude: Math.min(...groups.map((group) => group.latitude)),
    maxLatitude: Math.max(...groups.map((group) => group.latitude)),
    minLongitude: Math.min(...groups.map((group) => group.longitude)),
    maxLongitude: Math.max(...groups.map((group) => group.longitude)),
  };
}

function getMarkerGroupLabel(scenes: readonly SceneCatalogItem[]): string {
  const firstScene = scenes[0];

  if (!firstScene) {
    return "空白標記群組";
  }

  const locationIds = new Set(scenes.map((scene) => scene.location.id));

  if (locationIds.size === 1) {
    return firstScene.location.name;
  }

  return firstScene.location.areaName
    ? `${firstScene.location.areaName} 附近場景`
    : "附近場景";
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
