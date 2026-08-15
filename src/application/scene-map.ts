import {
  filterSceneCatalogItems,
  type SceneCatalogFilters,
  type SceneCatalogItem,
} from "@/application/scene-catalog";
import { isValidLatitude, isValidLongitude } from "@/domain/scene";

export const defaultMarkerGroupingRadiusMeters = 35;
export const defaultGoogleMapsEmbedZoom = 16;

export interface CoordinateLike {
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
}

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface NavigationTarget {
  href?: string;
  disabledReason?: string;
}

export interface GoogleMapsEmbedOptions {
  apiKey?: string;
  zoom?: number;
}

export interface SceneMapMarkerGroup {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl?: string;
  xPercent: number;
  yPercent: number;
  sceneCount: number;
  scenes: SceneCatalogItem[];
}

type ValidMapCoordinates = CoordinateLike & {
  latitude: number;
  longitude: number;
};

interface MutableMarkerGroup {
  latitude: number;
  longitude: number;
  mapsUrl?: string;
  scenes: SceneCatalogItem[];
}

interface MutableUrlMarkerGroup {
  mapsUrl: string;
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
    hasMappableMapReference(scene),
  );
}

export function hasValidMapCoordinates(
  coordinates: CoordinateLike,
): coordinates is ValidMapCoordinates {
  return (
    typeof coordinates.latitude === "number" &&
    typeof coordinates.longitude === "number" &&
    isValidLatitude(coordinates.latitude) &&
    isValidLongitude(coordinates.longitude)
  );
}

export function hasMappableMapReference(reference: CoordinateLike): boolean {
  return (
    getPreferredMapCoordinates(reference) !== undefined ||
    isEmbeddableMapReference(reference.mapsUrl)
  );
}

export function getPreferredMapCoordinates(
  reference: CoordinateLike,
): MapCoordinates | undefined {
  const coordinatesFromMapsUrl = parseGoogleMapsUrlCoordinates(
    reference.mapsUrl,
  );

  if (coordinatesFromMapsUrl) {
    return coordinatesFromMapsUrl;
  }

  if (hasValidMapCoordinates(reference)) {
    return {
      latitude: reference.latitude,
      longitude: reference.longitude,
    };
  }

  return undefined;
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
  const mapCoordinates = getPreferredMapCoordinates(coordinates);

  if (!mapCoordinates) {
    return undefined;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${mapCoordinates.latitude},${mapCoordinates.longitude}`;
}

export function buildGoogleMapsEmbedUrl(
  reference: CoordinateLike,
  options: GoogleMapsEmbedOptions = {},
): string | undefined {
  const mapsUrlEmbed = buildGoogleMapsEmbedUrlFromMapsUrl(
    reference.mapsUrl,
    options,
  );

  if (mapsUrlEmbed) {
    return mapsUrlEmbed;
  }

  const coordinates = getPreferredMapCoordinates(reference);

  return coordinates
    ? buildGoogleMapsEmbedUrlFromCoordinates(coordinates, options)
    : undefined;
}

export function parseGoogleMapsUrlCoordinates(
  mapsUrl?: string | null,
): MapCoordinates | undefined {
  const trimmed = mapsUrl?.trim();

  if (!trimmed) {
    return undefined;
  }

  const candidates = new Set([trimmed, safeDecodeUriComponent(trimmed)]);
  const url = parseHttpUrl(trimmed);

  if (url) {
    candidates.add(`${url.pathname}${url.search}${url.hash}`);

    for (const key of ["q", "query", "destination", "daddr", "ll", "center"]) {
      const value = url.searchParams.get(key);

      if (value) {
        candidates.add(value);
      }
    }
  }

  for (const candidate of candidates) {
    const decoded = safeDecodeUriComponent(candidate);
    const coordinates =
      parseCoordinatesFromGoogleDataSegments(decoded) ??
      parseCoordinatesFromMapAtPath(decoded) ??
      parseCoordinatePair(decoded);

    if (coordinates) {
      return coordinates;
    }
  }

  return undefined;
}

export function getNavigationTarget(
  coordinates: CoordinateLike,
): NavigationTarget {
  const mapsUrl = coordinates.mapsUrl?.trim();

  if (mapsUrl) {
    return {
      href: buildGoogleMapsNavigationHrefFromMapReference(mapsUrl),
    };
  }

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
  const coordinateGroups: MutableMarkerGroup[] = [];
  const urlOnlyGroups = new Map<string, MutableUrlMarkerGroup>();

  for (const scene of sortScenesForMap(scenes)) {
    const mapCoordinates = getPreferredMapCoordinates(scene);
    const mapsUrl = getTrimmedMapsUrl(scene.mapsUrl);

    if (!mapCoordinates) {
      if (mapsUrl && isEmbeddableMapReference(mapsUrl)) {
        const urlGroup = urlOnlyGroups.get(mapsUrl);

        if (urlGroup) {
          urlGroup.scenes.push(scene);
        } else {
          urlOnlyGroups.set(mapsUrl, {
            mapsUrl,
            scenes: [scene],
          });
        }
      }

      continue;
    }

    const existingGroup = coordinateGroups.find(
      (group) => distanceMeters(group, mapCoordinates) <= radiusMeters,
    );

    if (existingGroup) {
      existingGroup.scenes.push(scene);
      existingGroup.mapsUrl ??= mapsUrl;
      existingGroup.latitude = average(
        existingGroup.scenes
          .map(getPreferredMapCoordinates)
          .filter(isMapCoordinates)
          .map((coordinates) => coordinates.latitude),
      );
      existingGroup.longitude = average(
        existingGroup.scenes
          .map(getPreferredMapCoordinates)
          .filter(isMapCoordinates)
          .map((coordinates) => coordinates.longitude),
      );
    } else {
      coordinateGroups.push({
        latitude: mapCoordinates.latitude,
        longitude: mapCoordinates.longitude,
        mapsUrl,
        scenes: [scene],
      });
    }
  }

  const bounds = getMapBounds(coordinateGroups);
  const coordinateMarkerGroups = coordinateGroups.map((group, index) => {
    const projected = projectCoordinate(group, bounds);
    const sortedScenes = sortScenesForMap(group.scenes);

    return {
      id: `map-group-${index + 1}-${sortedScenes[0]?.sceneCode.toLowerCase() ?? "empty"}`,
      label: getMarkerGroupLabel(sortedScenes),
      latitude: group.latitude,
      longitude: group.longitude,
      mapsUrl: getFirstMapsUrl(sortedScenes) ?? group.mapsUrl,
      xPercent: projected.xPercent,
      yPercent: projected.yPercent,
      sceneCount: sortedScenes.length,
      scenes: sortedScenes,
    };
  });

  const unresolvedUrlGroups = [...urlOnlyGroups.values()].map(
    (group, index, groups) => {
      const projected = projectUrlOnlyGroup(index, groups.length);
      const sortedScenes = sortScenesForMap(group.scenes);

      return {
        id: `map-url-group-${index + 1}-${sortedScenes[0]?.sceneCode.toLowerCase() ?? "empty"}`,
        label: getMarkerGroupLabel(sortedScenes),
        latitude: null,
        longitude: null,
        mapsUrl: group.mapsUrl,
        xPercent: projected.xPercent,
        yPercent: projected.yPercent,
        sceneCount: sortedScenes.length,
        scenes: sortedScenes,
      };
    },
  );

  return [...coordinateMarkerGroups, ...unresolvedUrlGroups];
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

function buildGoogleMapsEmbedUrlFromMapsUrl(
  mapsUrl: string | null | undefined,
  options: GoogleMapsEmbedOptions,
): string | undefined {
  const trimmed = getTrimmedMapsUrl(mapsUrl);

  if (!trimmed || !isEmbeddableMapReference(trimmed)) {
    return undefined;
  }

  const parsedUrl = parseHttpUrl(trimmed);
  const coordinates = parseGoogleMapsUrlCoordinates(trimmed);

  if (options.apiKey?.trim() && coordinates) {
    return buildGoogleMapsEmbedUrlFromCoordinates(coordinates, options);
  }

  if (!parsedUrl) {
    return buildGoogleMapsSearchEmbedUrl(trimmed, options);
  }

  if (isGoogleMapsShortUrl(parsedUrl)) {
    return parsedUrl.toString();
  }

  parsedUrl.searchParams.set("output", "embed");

  return parsedUrl.toString();
}

function buildGoogleMapsNavigationHrefFromMapReference(
  mapReference: string,
): string {
  return parseHttpUrl(mapReference)
    ? mapReference
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapReference)}`;
}

function buildGoogleMapsEmbedUrlFromCoordinates(
  coordinates: MapCoordinates,
  options: GoogleMapsEmbedOptions,
): string {
  const center = `${coordinates.latitude},${coordinates.longitude}`;
  const zoom = String(options.zoom ?? defaultGoogleMapsEmbedZoom);
  const apiKey = options.apiKey?.trim();

  if (apiKey) {
    const params = new URLSearchParams({
      key: apiKey,
      center,
      zoom,
      maptype: "roadmap",
      language: "zh-TW",
    });

    return `https://www.google.com/maps/embed/v1/view?${params.toString()}`;
  }

  const params = new URLSearchParams({
    q: center,
    z: zoom,
    output: "embed",
  });

  return `https://www.google.com/maps?${params.toString()}`;
}

function buildGoogleMapsSearchEmbedUrl(
  query: string,
  options: GoogleMapsEmbedOptions,
): string {
  const apiKey = options.apiKey?.trim();

  if (apiKey) {
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      language: "zh-TW",
    });

    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
  }

  const params = new URLSearchParams({
    q: query,
    z: String(options.zoom ?? defaultGoogleMapsEmbedZoom),
    output: "embed",
  });

  return `https://www.google.com/maps?${params.toString()}`;
}

function parseCoordinatesFromGoogleDataSegments(
  text: string,
): MapCoordinates | undefined {
  const latitudeThenLongitude = text.match(
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  );

  if (latitudeThenLongitude) {
    return coordinatesFromNumbers(
      Number(latitudeThenLongitude[1]),
      Number(latitudeThenLongitude[2]),
    );
  }

  const longitudeThenLatitude = text.match(
    /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/,
  );

  if (longitudeThenLatitude) {
    return coordinatesFromNumbers(
      Number(longitudeThenLatitude[2]),
      Number(longitudeThenLatitude[1]),
    );
  }

  return undefined;
}

function parseCoordinatesFromMapAtPath(
  text: string,
): MapCoordinates | undefined {
  const match = text.match(
    /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)(?:[,/?#]|$)/,
  );

  return match
    ? coordinatesFromNumbers(Number(match[1]), Number(match[2]))
    : undefined;
}

function parseCoordinatePair(text: string): MapCoordinates | undefined {
  const match = text.match(
    /(?:^|[^\d.-])(?:loc:)?\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)(?=$|[^\d.])/,
  );

  return match
    ? coordinatesFromNumbers(Number(match[1]), Number(match[2]))
    : undefined;
}

function coordinatesFromNumbers(
  latitude: number,
  longitude: number,
): MapCoordinates | undefined {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return undefined;
  }

  return { latitude, longitude };
}

function isMapCoordinates(
  coordinates: MapCoordinates | undefined,
): coordinates is MapCoordinates {
  return coordinates !== undefined;
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

function isEmbeddableMapReference(mapReference?: string | null): boolean {
  const trimmed = mapReference?.trim();

  if (!trimmed) {
    return false;
  }

  const url = parseHttpUrl(trimmed);

  return url ? isGoogleMapsUrl(url) : true;
}

function isGoogleMapsUrl(url: URL): boolean {
  if (isGoogleMapsShortUrl(url)) {
    return true;
  }

  const hostname = url.hostname.toLowerCase();

  return (
    /^maps\.google\./i.test(hostname) ||
    (isGoogleDomain(hostname) && url.pathname.startsWith("/maps"))
  );
}

function isGoogleMapsShortUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  return hostname === "maps.app.goo.gl" || hostname === "goo.gl";
}

function isGoogleDomain(hostname: string): boolean {
  return /(^|\.)google\.[a-z.]+$/i.test(hostname);
}

function parseHttpUrl(value?: string | null): URL | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getTrimmedMapsUrl(mapsUrl?: string | null): string | undefined {
  const trimmed = mapsUrl?.trim();

  return trimmed || undefined;
}

function getFirstMapsUrl(
  scenes: readonly SceneCatalogItem[],
): string | undefined {
  for (const scene of scenes) {
    const mapsUrl = getTrimmedMapsUrl(scene.mapsUrl);

    if (mapsUrl) {
      return mapsUrl;
    }
  }

  return undefined;
}

function projectUrlOnlyGroup(
  index: number,
  total: number,
): { xPercent: number; yPercent: number } {
  if (total <= 1) {
    return {
      xPercent: 50,
      yPercent: 50,
    };
  }

  const columns = Math.min(3, total);
  const rows = Math.ceil(total / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    xPercent: ((column + 1) / (columns + 1)) * 100,
    yPercent: ((row + 1) / (rows + 1)) * 100,
  };
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
