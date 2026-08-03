"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearGoogleSessionCookie,
  readGoogleSessionCookie,
} from "@/infrastructure/google/google-session-cookie";
import {
  logoutGoogleSession,
  revokeGoogleAccountForSession,
  saveGoogleIntegrationSettings,
} from "@/infrastructure/repositories/google-integration-repository";

export async function saveGoogleSettingsAction(
  formData: FormData,
): Promise<void> {
  await saveGoogleIntegrationSettings({
    sheetId: readFormValue(formData, "sheetId"),
    sheetRange: readFormValue(formData, "sheetRange"),
    drivePhotoFolderId: readFormValue(formData, "drivePhotoFolderId"),
  });

  revalidatePath("/integrations/google");
  redirect("/integrations/google?googleMessage=settings_saved");
}

export async function logoutGoogleAction(): Promise<void> {
  await logoutGoogleSession(await readGoogleSessionCookie());
  await clearGoogleSessionCookie();
  revalidatePath("/integrations/google");
  redirect("/integrations/google?googleMessage=logged_out");
}

export async function revokeGoogleAction(): Promise<void> {
  await revokeGoogleAccountForSession(await readGoogleSessionCookie());
  await clearGoogleSessionCookie();
  revalidatePath("/integrations/google");
  redirect("/integrations/google?googleMessage=revoked");
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
