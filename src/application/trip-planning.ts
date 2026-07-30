import { summarizeTripProgress, type TripProgressSummary } from "@/domain/trip";
import type { SceneCatalogItem } from "@/application/scene-catalog";

export interface TripListItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  sceneCount: number;
  summary: TripProgressSummary;
}

export interface TripDaySceneItem {
  id: string;
  sortOrder: number;
  scene: SceneCatalogItem;
}

export interface TripDayPlanningItem {
  id: string;
  date: string;
  title?: string;
  scenes: TripDaySceneItem[];
  summary: TripProgressSummary;
}

export interface TripDetailItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  days: TripDayPlanningItem[];
  summary: TripProgressSummary;
}

export interface TripDaySelectionContext {
  tripDayId: string;
  tripId: string;
  tripName: string;
  date: string;
  addedSceneIds: string[];
}

export function buildTripDetailSummary(
  days: readonly TripDayPlanningItem[],
): TripProgressSummary {
  return summarizeTripProgress(
    days.flatMap((day) => day.scenes.map((item) => item.scene)),
  );
}

export function buildTripDaySummary(
  scenes: readonly SceneCatalogItem[],
): TripProgressSummary {
  return summarizeTripProgress(scenes);
}

export function formatTripDateForDisplay(date: string): string {
  return date;
}

export function getTripProgressPercent(summary: TripProgressSummary): number {
  if (summary.totalScenes === 0) {
    return 0;
  }

  return Math.round((summary.reviewed / summary.totalScenes) * 100);
}

export function isSceneAddedToTripDay(
  context: TripDaySelectionContext | undefined,
  sceneId: string,
): boolean {
  return context?.addedSceneIds.includes(sceneId) ?? false;
}
