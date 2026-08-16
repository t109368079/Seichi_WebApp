"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  normalizeSceneCreateInput,
  normalizeSceneEditableFields,
  type SceneCreateFormInput,
} from "@/application/scene-catalog";
import {
  createSceneCatalogItem,
  deleteSceneCatalogItem,
  updateSceneEditableFields,
} from "@/infrastructure/repositories/scene-catalog-repository";

export interface SceneCreateActionState {
  message?: string;
  values?: SceneCreateFormInput;
}

export async function handleCreateSceneAction(
  _previousState: SceneCreateActionState,
  formData: FormData,
): Promise<SceneCreateActionState> {
  const values = readSceneCreateFormValues(formData);
  let sceneId = "";

  try {
    const input = normalizeSceneCreateInput(values);
    const scene = await createSceneCatalogItem(input);
    sceneId = scene.id;

    revalidatePath("/scenes");
    revalidatePath("/map");
  } catch (error) {
    return {
      message: translateSceneEditError(error),
      values,
    };
  }

  redirect(appendSceneMessage(`/scenes/${sceneId}`, "場景已新增。"));
}

export async function updateSceneDetailsAction(
  formData: FormData,
): Promise<void> {
  const sceneId = readFormValue(formData, "sceneId");
  const returnTo = readFormValue(formData, "returnTo");
  const destination = getSafeSceneReturnTo(sceneId, returnTo);
  let message = "場景資料已更新。";

  try {
    const input = normalizeSceneEditableFields({
      locationName: readFormValue(formData, "locationName"),
      areaName: readFormValue(formData, "areaName"),
      latitude: readFormValue(formData, "latitude"),
      longitude: readFormValue(formData, "longitude"),
      mapsUrl: readFormValue(formData, "mapsUrl"),
      notes: readFormValue(formData, "notes"),
    });

    await updateSceneEditableFields(sceneId, input);
    revalidatePath("/scenes");
    revalidatePath(`/scenes/${sceneId}`);
    revalidatePath("/map");
  } catch (error) {
    message = translateSceneEditError(error);
  }

  redirect(appendSceneMessage(destination, message));
}

export async function deleteSceneAction(formData: FormData): Promise<void> {
  const sceneId = readFormValue(formData, "sceneId");
  const returnTo = readFormValue(formData, "returnTo");
  const destination = getSafeCatalogReturnTo(returnTo);
  let message = "場景已刪除。";

  try {
    const result = await deleteSceneCatalogItem(sceneId);
    message = `場景 ${result.sceneCode} 已刪除。`;
    revalidatePath("/scenes");
    revalidatePath("/map");
    revalidatePath("/trips");
  } catch (error) {
    message = translateSceneEditError(error);
  }

  redirect(appendSceneMessage(destination, message));
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readSceneCreateFormValues(formData: FormData): SceneCreateFormInput {
  return {
    sceneCode: readFormValue(formData, "sceneCode"),
    workName: readFormValue(formData, "workName"),
    workShortCode: readFormValue(formData, "workShortCode"),
    episode: readFormValue(formData, "episode"),
    animeImageDriveFileId: readFormValue(formData, "animeImageDriveFileId"),
    locationName: readFormValue(formData, "locationName"),
    areaName: readFormValue(formData, "areaName"),
    latitude: readFormValue(formData, "latitude"),
    longitude: readFormValue(formData, "longitude"),
    mapsUrl: readFormValue(formData, "mapsUrl"),
    notes: readFormValue(formData, "notes"),
  };
}

function getSafeSceneReturnTo(sceneId: string, returnTo: string): string {
  const fallback = sceneId ? `/scenes/${sceneId}` : "/scenes";

  return returnTo.startsWith(fallback) ? returnTo : fallback;
}

function getSafeCatalogReturnTo(returnTo: string): string {
  return returnTo.startsWith("/scenes") ? returnTo : "/scenes";
}

function appendSceneMessage(destination: string, message: string): string {
  const [path, query = ""] = destination.split("?");
  const params = new URLSearchParams(query);
  params.set("sceneMessage", message);

  return `${path}?${params.toString()}`;
}

function translateSceneEditError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("location name is required")) {
    return "請輸入地點名稱。";
  }

  if (message.includes("sceneCode is required")) {
    return "請輸入場景代碼。";
  }

  if (message.includes("sceneCode already exists")) {
    return "場景代碼已存在，請使用唯一的 scene code。";
  }

  if (message.includes("work name is required")) {
    return "請輸入作品名稱。";
  }

  if (message.includes("work short code is required")) {
    return "請輸入作品短代碼。";
  }

  if (message.includes("anime image Drive file id is required")) {
    return "請輸入動畫 Drive 檔案 ID。";
  }

  if (message.includes("area name is required")) {
    return "請輸入區域。";
  }

  if (message.includes("latitude and longitude must be provided together")) {
    return "緯度與經度需同時填寫，或只填地圖 URL。";
  }

  if (message.startsWith("Invalid latitude: ")) {
    return message.replace("Invalid latitude: ", "緯度無效：");
  }

  if (message.startsWith("Invalid longitude: ")) {
    return message.replace("Invalid longitude: ", "經度無效：");
  }

  if (message.includes("requires either coordinates or mapsUrl")) {
    return "座標或地圖 URL 至少需填一組。";
  }

  if (message.includes("Scene does not exist")) {
    return "找不到指定場景。";
  }

  if (message.includes("Scene is used in trip planning")) {
    return "此場景已加入行程，請先從行程移除後再刪除。";
  }

  if (message.includes("Scene has photos")) {
    return "此場景已有照片，不能直接刪除。";
  }

  return "場景資料更新失敗。";
}
