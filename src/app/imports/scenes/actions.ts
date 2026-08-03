"use server";

import {
  commitSceneImportCsv,
  commitSceneImportGoogleSheet,
  previewSceneImportCsv,
  previewSceneImportGoogleSheet,
} from "@/infrastructure/repositories/scene-import-repository";
import type { SceneImportPreview } from "@/application/scene-import";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";

export interface SceneImportActionState {
  stage: "idle" | "preview" | "committed" | "error";
  source?: "csv" | "sheet";
  csvText?: string;
  sheetId?: string;
  sheetRange?: string;
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
    if (intent === "commit-csv" || intent === "commit") {
      return await commitCsvImport(formData);
    }

    if (intent === "preview-sheet") {
      return await previewSheetImport(formData);
    }

    if (intent === "commit-sheet") {
      return await commitSheetImport(formData);
    }

    return await previewCsvImport(formData);
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

async function previewCsvImport(
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
    source: "csv",
    csvText,
    preview,
    message: preview.canCommit
      ? "預覽已完成。"
      : "請先修正 CSV 錯誤，再確認匯入。",
  };
}

async function commitCsvImport(
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
      source: "csv",
      csvText,
      preview: result.preview,
      message: "請先修正 CSV 錯誤，再確認匯入。",
    };
  }

  return {
    stage: "committed",
    source: "csv",
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

async function previewSheetImport(
  formData: FormData,
): Promise<SceneImportActionState> {
  const sheetId = readFormValue(formData, "sheetId");
  const sheetRange = readFormValue(formData, "sheetRange");
  const googleSessionToken = await readGoogleSessionCookie();

  if (!googleSessionToken) {
    return {
      stage: "error",
      source: "sheet",
      sheetId,
      sheetRange,
      message: "請先連接 Google，再預覽 Google Sheet。",
    };
  }

  const preview = await previewSceneImportGoogleSheet({
    googleSessionToken,
    sheetId,
    sheetRange,
  });

  return {
    stage: "preview",
    source: "sheet",
    sheetId,
    sheetRange,
    preview,
    message: preview.canCommit
      ? "Google Sheet 預覽已完成。"
      : "請先修正 Google Sheet 錯誤，再確認匯入。",
  };
}

async function commitSheetImport(
  formData: FormData,
): Promise<SceneImportActionState> {
  const sheetId = readFormValue(formData, "sheetId");
  const sheetRange = readFormValue(formData, "sheetRange");
  const googleSessionToken = await readGoogleSessionCookie();

  if (!googleSessionToken) {
    return {
      stage: "error",
      source: "sheet",
      sheetId,
      sheetRange,
      message: "請先連接 Google，再確認 Google Sheet 匯入。",
    };
  }

  const result = await commitSceneImportGoogleSheet({
    googleSessionToken,
    sheetId,
    sheetRange,
  });

  if (!result.ok) {
    return {
      stage: "preview",
      source: "sheet",
      sheetId,
      sheetRange,
      preview: result.preview,
      message: "請先修正 Google Sheet 錯誤，再確認匯入。",
    };
  }

  return {
    stage: "committed",
    source: "sheet",
    sheetId,
    sheetRange,
    preview: result.preview,
    message: "Google Sheet 匯入完成。",
    commitResult: {
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      sceneCodes: result.sceneCodes,
    },
  };
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
