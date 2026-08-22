import { requireAppPageAccess } from "@/app/access-control";
import { SceneMap } from "@/components/scene-map";
import { isSceneStatus, type SceneStatus } from "@/domain/scene";
import { getSceneMapData } from "@/infrastructure/repositories/scene-map-repository";
import { getTripDaySelectionContext } from "@/infrastructure/repositories/trip-planning-repository";

export const dynamic = "force-dynamic";

interface SceneMapPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readFilters(params: Record<string, string | string[] | undefined>) {
  const workId = firstSearchParam(params.workId);
  const locationId = firstSearchParam(params.locationId);
  const rawStatus = firstSearchParam(params.status);
  const status: SceneStatus | undefined =
    rawStatus && isSceneStatus(rawStatus) ? rawStatus : undefined;

  return {
    workId: workId || undefined,
    locationId: locationId || undefined,
    status,
  };
}

export default async function SceneMapPage({
  searchParams,
}: SceneMapPageProps) {
  await requireAppPageAccess();

  const params = await searchParams;
  const filters = readFilters(params);
  const tripDayId = firstSearchParam(params.tripDayId);
  const selectedMarkerGroupId = firstSearchParam(params.markerGroupId);
  const [mapData, tripDayContext] = await Promise.all([
    getSceneMapData(filters),
    getTripDaySelectionContext(tripDayId),
  ]);

  return (
    <SceneMap
      markerGroups={mapData.markerGroups}
      mapSceneCount={mapData.mapScenes.length}
      totalSceneCount={mapData.allScenes.length}
      omittedSceneCount={mapData.omittedSceneCount}
      works={mapData.works}
      locations={mapData.locations}
      filters={filters}
      tripDayContext={tripDayContext}
      returnTo={buildCurrentHref("/map", params)}
      selectedMarkerGroupId={selectedMarkerGroupId}
      googleMapsEmbedApiKey={process.env.GOOGLE_MAPS_EMBED_API_KEY}
    />
  );
}

function buildCurrentHref(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
    } else if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}
