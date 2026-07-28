import { SceneCatalog } from "@/components/scene-catalog";
import { isSceneStatus, type SceneStatus } from "@/domain/scene";
import { getSceneCatalogData } from "@/infrastructure/repositories/scene-catalog-repository";

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
  const filters = readFilters(await searchParams);
  const catalog = await getSceneCatalogData(filters);

  return (
    <SceneCatalog
      scenes={catalog.scenes}
      totalSceneCount={catalog.allScenes.length}
      works={catalog.works}
      locations={catalog.locations}
      filters={filters}
    />
  );
}
