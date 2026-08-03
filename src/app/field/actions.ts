"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertFieldStatusAction } from "@/domain/scene-status";
import { updateSceneStatusFromField } from "@/infrastructure/repositories/field-mode-repository";
import { deleteScenePhoto } from "@/infrastructure/repositories/scene-photo-repository";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";

export async function applyFieldStatusAction(
  formData: FormData,
): Promise<void> {
  const sceneId = readFormValue(formData, "sceneId");
  const tripDayId = readFormValue(formData, "tripDayId");
  const tripSceneId = readFormValue(formData, "tripSceneId");
  const rawAction = readFormValue(formData, "action");

  let destination = tripSceneId
    ? `/field/${tripDayId}/${tripSceneId}`
    : `/field/${tripDayId}`;

  try {
    await updateSceneStatusFromField(
      sceneId,
      assertFieldStatusAction(rawAction),
    );
  } catch (error) {
    destination = appendMessage(destination, translateFieldError(error));
  }

  revalidatePath(`/field/${tripDayId}`);
  revalidatePath(destination);
  redirect(destination);
}

/**
 * Deletion stays a server action because the payload is one id. Only the upload
 * needs a route handler, and only because of the server action body size limit.
 */
export async function deleteScenePhotoAction(
  formData: FormData,
): Promise<void> {
  const photoId = readFormValue(formData, "photoId");
  const tripDayId = readFormValue(formData, "tripDayId");
  const tripSceneId = readFormValue(formData, "tripSceneId");

  let destination = tripSceneId
    ? `/field/${tripDayId}/${tripSceneId}`
    : `/field/${tripDayId}`;

  try {
    await deleteScenePhoto(photoId, await readGoogleSessionCookie());
  } catch (error) {
    destination = appendMessage(destination, translatePhotoError(error));
  }

  revalidatePath(`/field/${tripDayId}`);
  revalidatePath(destination);
  redirect(destination);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function appendMessage(destination: string, message: string): string {
  const [path, query = ""] = destination.split("?");
  const params = new URLSearchParams(query);
  params.set("fieldMessage", message);

  return `${path}?${params.toString()}`;
}

function translateFieldError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Illegal SceneStatus transition")) {
    return "此狀態轉換不被允許。";
  }

  if (message.includes("Invalid FieldStatusAction")) {
    return "無效的現地操作。";
  }

  if (message.includes("Scene does not exist")) {
    return "找不到指定的場景。";
  }

  return "現地狀態更新失敗，請稍後再試。";
}

function translatePhotoError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Scene photo does not exist")) {
    return "找不到這張照片，可能已被刪除。";
  }

  if (message.includes("Illegal SceneStatus transition")) {
    return "刪除照片後的狀態轉換不被允許。";
  }

  return "刪除照片失敗，請稍後再試。";
}
