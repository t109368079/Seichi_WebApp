import {
  buildFieldSceneCursor,
  getFieldCompletionSummary,
  resolveTodayTripDayId,
  type FieldDayView,
  type FieldSceneCursor,
} from "@/application/field-mode";
import { assertSceneStatus, type SceneStatus } from "@/domain/scene";
import {
  getFieldStatusActions,
  resolveFieldStatusTarget,
  type FieldStatusAction,
} from "@/domain/scene-status";
import { prisma } from "@/infrastructure/database/prisma";
import { getTripDetail } from "@/infrastructure/repositories/trip-planning-repository";

export interface FieldSceneView {
  day: FieldDayView;
  cursor: FieldSceneCursor;
}

export interface FieldStatusUpdateResult {
  sceneId: string;
  previousStatus: SceneStatus;
  status: SceneStatus;
}

/**
 * Reuses `getTripDetail` so Field Mode can never disagree with Trip Detail about
 * manual scene order or day summaries.
 */
export async function getFieldModeDay(
  tripDayId: string,
): Promise<FieldDayView | null> {
  const tripDay = await prisma.tripDay.findUnique({
    where: {
      id: tripDayId,
    },
    select: {
      tripId: true,
    },
  });

  if (!tripDay) {
    return null;
  }

  const trip = await getTripDetail(tripDay.tripId);
  const day = trip?.days.find((item) => item.id === tripDayId);

  if (!trip || !day) {
    return null;
  }

  return {
    tripId: trip.id,
    tripName: trip.name,
    tripDayId: day.id,
    date: day.date,
    title: day.title,
    scenes: day.scenes,
    summary: day.summary,
    completion: getFieldCompletionSummary(day.summary),
  };
}

export async function getFieldModeScene(
  tripDayId: string,
  tripSceneId: string,
): Promise<FieldSceneView | null> {
  const day = await getFieldModeDay(tripDayId);

  if (!day) {
    return null;
  }

  const cursor = buildFieldSceneCursor(day.scenes, tripSceneId);

  if (!cursor) {
    return null;
  }

  return {
    day,
    cursor,
  };
}

/**
 * Resolves the local calendar date to a TripDay, falling back to the first day
 * so the shortcut still lands somewhere useful outside the trip's date range.
 */
export async function resolveTodayFieldTripDayId(
  tripId: string,
  todayIso: string,
): Promise<string | undefined> {
  const trip = await getTripDetail(tripId);

  if (!trip) {
    return undefined;
  }

  return resolveTodayTripDayId(trip.days, todayIso) ?? trip.days[0]?.id;
}

export async function updateSceneStatusFromField(
  sceneId: string,
  action: FieldStatusAction,
): Promise<FieldStatusUpdateResult> {
  return await prisma.$transaction(async (transaction) => {
    const scene = await transaction.scene.findUnique({
      where: {
        id: sceneId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!scene) {
      throw new Error("Scene does not exist.");
    }

    const previousStatus = assertSceneStatus(scene.status);
    const nextStatus = resolveFieldStatusTarget(action);

    if (!getFieldStatusActions(previousStatus).includes(action)) {
      throw new Error(
        `Illegal SceneStatus transition: ${previousStatus} -> ${nextStatus}`,
      );
    }

    await transaction.scene.update({
      where: {
        id: sceneId,
      },
      data: {
        status: nextStatus,
      },
    });

    return {
      sceneId,
      previousStatus,
      status: nextStatus,
    };
  });
}
