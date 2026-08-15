import {
  filterSceneMapItems,
  groupSceneMapMarkers,
  hasMappableMapReference,
  type SceneMapMarkerGroup,
} from "@/application/scene-map";
import type {
  SceneCatalogFilters,
  SceneCatalogItem,
} from "@/application/scene-catalog";
import {
  getSceneCatalogData,
  type SceneCatalogData,
} from "@/infrastructure/repositories/scene-catalog-repository";

export interface SceneMapData extends SceneCatalogData {
  mapScenes: SceneCatalogItem[];
  markerGroups: SceneMapMarkerGroup[];
  omittedSceneCount: number;
}

export async function getSceneMapData(
  filters: SceneCatalogFilters,
): Promise<SceneMapData> {
  const catalog = await getSceneCatalogData(filters);
  const mapScenes = filterSceneMapItems(catalog.allScenes, filters);

  return {
    ...catalog,
    mapScenes,
    markerGroups: groupSceneMapMarkers(mapScenes),
    omittedSceneCount: catalog.scenes.filter(
      (scene) => !hasMappableMapReference(scene),
    ).length,
  };
}
