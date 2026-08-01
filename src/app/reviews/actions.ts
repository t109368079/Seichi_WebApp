"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertReviewStatusAction } from "@/domain/review";
import {
  selectBestScenePhoto,
  updateSceneReviewStatus,
} from "@/infrastructure/repositories/review-repository";

export async function selectBestPhotoAction(formData: FormData): Promise<void> {
  const photoId = readFormValue(formData, "photoId");
  const sceneId = readFormValue(formData, "sceneId");
  let destination = `/reviews/${sceneId}?photoId=${photoId}`;

  try {
    await selectBestScenePhoto(photoId);
    destination = appendMessage(destination, "已更新最佳照片。");
  } catch (error) {
    destination = appendMessage(destination, translateReviewError(error));
  }

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${sceneId}`);
  redirect(destination);
}

export async function applyReviewStatusAction(
  formData: FormData,
): Promise<void> {
  const sceneId = readFormValue(formData, "sceneId");
  const rawAction = readFormValue(formData, "action");
  let destination = `/reviews/${sceneId}`;

  try {
    await updateSceneReviewStatus(sceneId, assertReviewStatusAction(rawAction));
    destination = appendMessage(destination, "已更新審核狀態。");
  } catch (error) {
    destination = appendMessage(destination, translateReviewError(error));
  }

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${sceneId}`);
  redirect(destination);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function appendMessage(destination: string, message: string): string {
  const [path, query = ""] = destination.split("?");
  const params = new URLSearchParams(query);
  params.set("reviewMessage", message);

  return `${path}?${params.toString()}`;
}

function translateReviewError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Scene photo does not exist")) {
    return "找不到這張照片，可能已被刪除。";
  }

  if (message.includes("Scene photo does not belong")) {
    return "這張照片不屬於目前場景。";
  }

  if (message.includes("Cannot mark a Scene REVIEWED without photos")) {
    return "沒有實景照片時不可標記已審核。";
  }

  if (message.includes("Cannot mark a Scene REVIEWED without a best photo")) {
    return "請先選擇最佳照片，再標記已審核。";
  }

  if (message.includes("Illegal SceneStatus transition")) {
    return "此審核狀態轉換不被允許。";
  }

  if (message.includes("Invalid ReviewStatusAction")) {
    return "無效的審核操作。";
  }

  if (message.includes("Scene does not exist")) {
    return "找不到指定的場景。";
  }

  return "審核操作失敗，請稍後再試。";
}
