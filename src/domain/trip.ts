import type { SceneStatus } from "@/domain/scene";

export interface TripDateRange {
  startDate: string;
  endDate: string;
}

export interface OrderedTripScene {
  id: string;
  sortOrder: number;
}

export type TripSceneMoveDirection = "up" | "down";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTripDate(value: string): boolean {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const parsed = parseTripDate(value);

  return parsed !== undefined && formatTripDate(parsed) === value;
}

export function assertValidTripDate(value: string, label = "date"): string {
  if (!isValidTripDate(value)) {
    throw new Error(`${label} must use yyyy-mm-dd format.`);
  }

  return value;
}

export function assertValidTripDateRange(range: TripDateRange): TripDateRange {
  assertValidTripDate(range.startDate, "startDate");
  assertValidTripDate(range.endDate, "endDate");

  if (range.startDate > range.endDate) {
    throw new Error("startDate must be before or equal to endDate.");
  }

  return range;
}

export function buildTripDayDates(range: TripDateRange): string[] {
  assertValidTripDateRange(range);

  const dates: string[] = [];
  const start = parseTripDate(range.startDate);
  const end = parseTripDate(range.endDate);

  if (!start || !end) {
    return dates;
  }

  for (
    let cursor = start;
    cursor.getTime() <= end.getTime();
    cursor = addUtcDays(cursor, 1)
  ) {
    dates.push(formatTripDate(cursor));
  }

  return dates;
}

export function normalizeTripSceneOrder<T extends OrderedTripScene>(
  scenes: readonly T[],
): (T & OrderedTripScene)[] {
  return applyContiguousSortOrder(
    [...scenes].sort((first, second) => {
      if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      return first.id.localeCompare(second.id);
    }),
  );
}

export function getNextTripSceneSortOrder(
  scenes: readonly OrderedTripScene[],
): number {
  if (scenes.length === 0) {
    return 1;
  }

  return Math.max(...scenes.map((scene) => scene.sortOrder)) + 1;
}

export function moveTripSceneOrder(
  scenes: readonly OrderedTripScene[],
  tripSceneId: string,
  direction: TripSceneMoveDirection,
): OrderedTripScene[] {
  const normalized = normalizeTripSceneOrder(scenes);
  const currentIndex = normalized.findIndex(
    (scene) => scene.id === tripSceneId,
  );

  if (currentIndex === -1) {
    throw new Error(`TripScene ${tripSceneId} is not in the selected day.`);
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= normalized.length) {
    return normalized;
  }

  const reordered = [...normalized];
  const [moved] = reordered.splice(currentIndex, 1);

  if (!moved) {
    return normalized;
  }

  reordered.splice(targetIndex, 0, moved);

  return applyContiguousSortOrder(reordered);
}

export function reorderTripSceneIds(
  orderedTripSceneIds: readonly string[],
): OrderedTripScene[] {
  const seen = new Set<string>();

  for (const id of orderedTripSceneIds) {
    if (id.trim().length === 0) {
      throw new Error("TripScene id is required.");
    }

    if (seen.has(id)) {
      throw new Error(`TripScene ${id} appears more than once.`);
    }

    seen.add(id);
  }

  return orderedTripSceneIds.map((id, index) => ({
    id,
    sortOrder: index + 1,
  }));
}

export function assertSceneCanBeAddedToTripDay(
  existingSceneIds: readonly string[],
  sceneId: string,
): void {
  if (existingSceneIds.includes(sceneId)) {
    throw new Error("Scene is already in this trip day.");
  }
}

export interface TripProgressInput {
  status: SceneStatus;
  latitude?: number | null;
  longitude?: number | null;
}

export interface TripProgressSummary {
  totalScenes: number;
  notShot: number;
  pendingReview: number;
  reviewed: number;
  retakeRequired: number;
  skipped: number;
  missingCoordinates: number;
}

export function summarizeTripProgress(
  scenes: readonly TripProgressInput[],
): TripProgressSummary {
  const summary: TripProgressSummary = {
    totalScenes: scenes.length,
    notShot: 0,
    pendingReview: 0,
    reviewed: 0,
    retakeRequired: 0,
    skipped: 0,
    missingCoordinates: 0,
  };

  for (const scene of scenes) {
    if (scene.status === "NOT_SHOT") {
      summary.notShot += 1;
    } else if (scene.status === "PENDING_REVIEW") {
      summary.pendingReview += 1;
    } else if (scene.status === "REVIEWED") {
      summary.reviewed += 1;
    } else if (scene.status === "RETAKE_REQUIRED") {
      summary.retakeRequired += 1;
    } else if (scene.status === "SKIPPED") {
      summary.skipped += 1;
    }

    if (
      typeof scene.latitude !== "number" ||
      typeof scene.longitude !== "number" ||
      !Number.isFinite(scene.latitude) ||
      !Number.isFinite(scene.longitude)
    ) {
      summary.missingCoordinates += 1;
    }
  }

  return summary;
}

export function tripDateStringToDate(value: string): Date {
  assertValidTripDate(value);

  const parsed = parseTripDate(value);

  if (!parsed) {
    throw new Error(`Invalid trip date: ${value}`);
  }

  return parsed;
}

export function tripDateToString(value: Date): string {
  return formatTripDate(value);
}

function parseTripDate(value: string): Date | undefined {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);

  return next;
}

function formatTripDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function applyContiguousSortOrder<T extends OrderedTripScene>(
  scenes: readonly T[],
): (T & OrderedTripScene)[] {
  return scenes.map((scene, index) => ({
    ...scene,
    sortOrder: index + 1,
  }));
}
