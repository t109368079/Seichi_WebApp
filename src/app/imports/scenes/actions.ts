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
          ? `Import failed before any database changes were kept. ${error.message}`
          : "Import failed before any database changes were kept.",
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
      message: "Choose a CSV file before previewing.",
    };
  }

  const csvText = await file.text();
  const preview = await previewSceneImportCsv(csvText);

  return {
    stage: "preview",
    csvText,
    preview,
    message: preview.canCommit
      ? "Preview is ready."
      : "Fix CSV errors before confirming the import.",
  };
}

async function commitImport(
  formData: FormData,
): Promise<SceneImportActionState> {
  const csvText = formData.get("csvText");

  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return {
      stage: "error",
      message: "Preview a CSV file before confirming the import.",
    };
  }

  const result = await commitSceneImportCsv(csvText);

  if (!result.ok) {
    return {
      stage: "preview",
      csvText,
      preview: result.preview,
      message: "Fix CSV errors before confirming the import.",
    };
  }

  return {
    stage: "committed",
    csvText,
    preview: result.preview,
    message: "Import complete.",
    commitResult: {
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      sceneCodes: result.sceneCodes,
    },
  };
}
