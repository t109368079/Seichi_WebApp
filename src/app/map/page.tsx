import { SceneMap } from "@/components/scene-map";
import { isSceneStatus, type SceneStatus } from "@/domain/scene";
import { getSceneMapData } from "@/infrastructure/repositories/scene-map-repository";

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
  const filters = readFilters(await searchParams);
  const mapData = await getSceneMapData(filters);

  return (
    <SceneMap
      markerGroups={mapData.markerGroups}
      mapSceneCount={mapData.mapScenes.length}
      totalSceneCount={mapData.allScenes.length}
      omittedSceneCount={mapData.omittedSceneCount}
      works={mapData.works}
      locations={mapData.locations}
      filters={filters}
    />
  );
}
