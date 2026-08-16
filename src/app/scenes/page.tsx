import { SceneCatalog } from "@/components/scene-catalog";
import { isSceneStatus, type SceneStatus } from "@/domain/scene";
import { getSceneCatalogData } from "@/infrastructure/repositories/scene-catalog-repository";
import { getTripDaySelectionContext } from "@/infrastructure/repositories/trip-planning-repository";

export const dynamic = "force-dynamic";

interface ScenePageProps {
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

export default async function ScenesPage({ searchParams }: ScenePageProps) {
  const params = await searchParams;
  const filters = readFilters(params);
  const tripDayId = firstSearchParam(params.tripDayId);
  const sceneMessage = firstSearchParam(params.sceneMessage);
  const [catalog, tripDayContext] = await Promise.all([
    getSceneCatalogData(filters),
    getTripDaySelectionContext(tripDayId),
  ]);

  return (
    <SceneCatalog
      scenes={catalog.scenes}
      totalSceneCount={catalog.allScenes.length}
      works={catalog.works}
      locations={catalog.locations}
      filters={filters}
      tripDayContext={tripDayContext}
      returnTo={buildCurrentHref("/scenes", params)}
      sceneMessage={sceneMessage}
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
