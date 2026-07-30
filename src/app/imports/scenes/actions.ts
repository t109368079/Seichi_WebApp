"use server";

import {
  commitSceneImportCsv,
  previewSceneImportCsv,
} from "@/infrastructure/repositories/scene-import-repository";
import type { SceneImportPreview } from "@/application/scene-import";

export interface SceneImportActionState {
  stage: "idle" | "preview" | "committed" | "error";
  csvText?: string;
  message?: string;
  preview?: SceneImportPreview;
  commitResult?: {
    createdCount: number;
    updatedCount: number;
    sceneCodes: string[];
  };
}

export async function handleSceneImportAction(
  _previousState: SceneImportActionState,
  formData: FormData,
): Promise<SceneImportActionState> {
  const intent = formData.get("intent");

  try {
    if (intent === "commit") {
      return await commitImport(formData);
    }

    return await previewImport(formData);
  } catch (error) {
    return {
      stage: "error",
      message:
        error instanceof Error
          ? `匯入失敗，資料庫未保留任何變更。${error.message}`
          : "匯入失敗，資料庫未保留任何變更。",
    };
  }
}

async function previewImport(
  formData: FormData,
): Promise<SceneImportActionState> {
  const file = formData.get("csvFile");

  if (!(file instanceof File) || file.size === 0) {
    return {
      stage: "error",
      message: "請先選擇 CSV 檔案再預覽。",
    };
  }

  const csvText = await file.text();
  const preview = await previewSceneImportCsv(csvText);

  return {
    stage: "preview",
    csvText,
    preview,
    message: preview.canCommit
      ? "預覽已完成。"
      : "請先修正 CSV 錯誤，再確認匯入。",
  };
}

async function commitImport(
  formData: FormData,
): Promise<SceneImportActionState> {
  const csvText = formData.get("csvText");

  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return {
      stage: "error",
      message: "請先預覽 CSV 檔案，再確認匯入。",
    };
  }

  const result = await commitSceneImportCsv(csvText);

  if (!result.ok) {
    return {
      stage: "preview",
      csvText,
      preview: result.preview,
      message: "請先修正 CSV 錯誤，再確認匯入。",
    };
  }

  return {
    stage: "committed",
    csvText,
    preview: result.preview,
    message: "匯入完成。",
    commitResult: {
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      sceneCodes: result.sceneCodes,
    },
  };
}
