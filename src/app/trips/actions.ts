"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addSceneToTripDay,
  addScenesToTripDay,
  createTrip,
  deleteTrip,
  moveTripSceneInDay,
  removeTripScene,
  reorderTripDayScenes,
} from "@/infrastructure/repositories/trip-planning-repository";
import type { TripSceneMoveDirection } from "@/domain/trip";

export interface TripCreateActionState {
  message?: string;
}

export async function handleCreateTripAction(
  _previousState: TripCreateActionState,
  formData: FormData,
): Promise<TripCreateActionState> {
  const name = readFormValue(formData, "name");
  const startDate = readFormValue(formData, "startDate");
  const endDate = readFormValue(formData, "endDate");

  let tripId = "";

  try {
    const result = await createTrip({
      name,
      startDate,
      endDate,
    });
    tripId = result.tripId;
  } catch (error) {
    return {
      message: translateTripError(error),
    };
  }

  revalidatePath("/trips");
  redirect(`/trips/${tripId}`);
}

export async function deleteTripAction(formData: FormData): Promise<void> {
  const tripId = readFormValue(formData, "tripId");

  await deleteTrip(tripId);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function addSceneToTripDayAction(
  formData: FormData,
): Promise<void> {
  const tripDayId = readFormValue(formData, "tripDayId");
  const sceneId = readFormValue(formData, "sceneId");
  let destination = readFormValue(formData, "returnTo") || "/trips";

  try {
    const result = await addSceneToTripDay(tripDayId, sceneId);
    destination = `/trips/${result.tripId}`;
    revalidatePath(destination);
  } catch (error) {
    destination = appendMessage(destination, translateTripError(error));
  }

  redirect(destination);
}

export async function addScenesToTripDayAction(
  formData: FormData,
): Promise<void> {
  const tripDayId = readFormValue(formData, "tripDayId");
  const sceneIds = formData
    .getAll("sceneId")
    .filter((value): value is string => typeof value === "string");
  const destination = readFormValue(formData, "returnTo") || "/trips";
  let result;

  try {
    result = await addScenesToTripDay(tripDayId, sceneIds);
  } catch (error) {
    redirect(appendMessage(destination, translateTripError(error)));
  }

  redirectToTripDay(result.tripId, result.tripDayId);
}

export async function moveTripSceneAction(formData: FormData): Promise<void> {
  const tripSceneId = readFormValue(formData, "tripSceneId");
  const rawDirection = readFormValue(formData, "direction");
  const direction: TripSceneMoveDirection =
    rawDirection === "up" ? "up" : "down";
  const result = await moveTripSceneInDay(tripSceneId, direction);

  redirectToTripDay(result.tripId, result.tripDayId);
}

export async function reorderTripDayScenesAction(
  formData: FormData,
): Promise<void> {
  const tripDayId = readFormValue(formData, "tripDayId");
  const orderedTripSceneIds = formData
    .getAll("tripSceneId")
    .filter((value): value is string => typeof value === "string");
  const result = await reorderTripDayScenes(tripDayId, orderedTripSceneIds);

  redirectToTripDay(result.tripId, result.tripDayId);
}

export async function removeTripSceneAction(formData: FormData): Promise<void> {
  const tripSceneId = readFormValue(formData, "tripSceneId");
  const result = await removeTripScene(tripSceneId);

  redirectToTripDay(result.tripId, result.tripDayId);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectToTripDay(
  tripId: string,
  tripDayId: string | undefined,
): never {
  revalidatePath(`/trips/${tripId}`);
  redirect(
    tripDayId ? `/trips/${tripId}#day-${tripDayId}` : `/trips/${tripId}`,
  );
}

function appendMessage(destination: string, message: string): string {
  const [path, query = ""] = destination.split("?");
  const params = new URLSearchParams(query);
  params.set("tripMessage", message);

  return `${path}?${params.toString()}`;
}

function translateTripError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Trip name is required")) {
    return "請輸入旅行名稱。";
  }

  if (message.includes("startDate must use")) {
    return "請輸入有效的開始日期。";
  }

  if (message.includes("endDate must use")) {
    return "請輸入有效的結束日期。";
  }

  if (message.includes("startDate must be before")) {
    return "開始日期不可晚於結束日期。";
  }

  if (message.includes("already in this trip day")) {
    return "此場景已加入這一天。";
  }

  if (message.includes("At least one scene is required")) {
    return "請先勾選要加入的場景。";
  }

  if (message.includes("appears more than once")) {
    return "同一場景不可重複加入。";
  }

  if (message.includes("Trip day does not exist")) {
    return "找不到指定的行程日期。";
  }

  if (message.includes("Scene does not exist")) {
    return "找不到指定的場景。";
  }

  return "行程操作失敗，請稍後再試。";
}
