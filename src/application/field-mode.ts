import type { SceneStatus } from "@/domain/scene";
import {
  getFieldStatusActions,
  isTerminalFieldStatus,
  type FieldStatusAction,
} from "@/domain/scene-status";
import type { TripProgressSummary } from "@/domain/trip";
import type {
  TripDayPlanningItem,
  TripDaySceneItem,
} from "@/application/trip-planning";

export interface FieldDayView {
  tripId: string;
  tripName: string;
  tripDayId: string;
  date: string;
  title?: string;
  scenes: TripDaySceneItem[];
  summary: TripProgressSummary;
  completion: FieldCompletionSummary;
}

export interface FieldSceneCursor {
  current: TripDaySceneItem;
  previous?: TripDaySceneItem;
  next?: TripDaySceneItem;
  position: number;
  total: number;
}

export interface FieldCompletionSummary {
  total: number;
  handled: number;
  remaining: number;
  percent: number;
}

/**
 * Field Mode reports "handled" instead of reusing `getTripProgressPercent`.
 * That helper counts `reviewed / total`, and Phase 5 cannot reach `REVIEWED`,
 * so it would read 0% for the whole trip while standing on site.
 */
export function getFieldCompletionSummary(
  summary: TripProgressSummary,
): FieldCompletionSummary {
  const total = summary.totalScenes;
  const remaining = summary.notShot + summary.retakeRequired;
  const handled = total - remaining;

  return {
    total,
    handled,
    remaining,
    percent: total === 0 ? 0 : Math.round((handled / total) * 100),
  };
}

export function resolveTodayTripDayId(
  days: readonly Pick<TripDayPlanningItem, "id" | "date">[],
  todayIso: string,
): string | undefined {
  return days.find((day) => day.date === todayIso)?.id;
}

export function buildFieldSceneCursor(
  scenes: readonly TripDaySceneItem[],
  tripSceneId: string,
): FieldSceneCursor | undefined {
  const currentIndex = scenes.findIndex((item) => item.id === tripSceneId);
  const current = scenes[currentIndex];

  if (currentIndex === -1 || !current) {
    return undefined;
  }

  return {
    current,
    previous: scenes[currentIndex - 1],
    next: scenes[currentIndex + 1],
    position: currentIndex + 1,
    total: scenes.length,
  };
}

export function getFieldSceneActions(status: SceneStatus): FieldStatusAction[] {
  return getFieldStatusActions(status);
}

export function isFieldSceneReadOnly(status: SceneStatus): boolean {
  return isTerminalFieldStatus(status);
}

export function getFieldStatusActionLabel(action: FieldStatusAction): string {
  const labels = {
    MARK_PENDING_REVIEW: "標記待確認",
    MARK_RETAKE_REQUIRED: "標記需要補拍",
    MARK_SKIPPED: "跳過此場景",
    RESET_TO_NOT_SHOT: "返回未拍攝",
  } satisfies Record<FieldStatusAction, string>;

  return labels[action];
}

export function getFieldDayHref(tripDayId: string): string {
  return `/field/${tripDayId}`;
}

export function getFieldSceneHref(
  tripDayId: string,
  tripSceneId: string,
): string {
  return `/field/${tripDayId}/${tripSceneId}`;
}
