"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeSceneEditableFields } from "@/application/scene-catalog";
import { updateSceneEditableFields } from "@/infrastructure/repositories/scene-catalog-repository";

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

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getSafeSceneReturnTo(sceneId: string, returnTo: string): string {
  const fallback = sceneId ? `/scenes/${sceneId}` : "/scenes";

  return returnTo.startsWith(fallback) ? returnTo : fallback;
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

  return "場景資料更新失敗。";
}
