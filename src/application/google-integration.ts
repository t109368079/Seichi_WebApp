export const googlePhotosPickerScope =
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

export const googleOAuthScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  googlePhotosPickerScope,
] as const;

export const defaultGoogleSheetRange = "Sheet1!A:K";

export const googleSessionCookieName = "seichi_google_session";
export const googleOAuthStateCookieName = "seichi_google_oauth_state";
export const googleSessionTtlDays = 30;

export interface GoogleIntegrationSettingsInput {
  sheetId?: string;
  sheetRange?: string;
  drivePhotoFolderId?: string;
}

export interface GoogleIntegrationStatus {
  configured: boolean;
  connected: boolean;
  email?: string;
  name?: string;
  scopes: readonly string[];
  expiresAt?: string;
  revokedAt?: string;
  missingConfig: readonly string[];
}

export function normalizeGoogleIntegrationSettings(
  input: GoogleIntegrationSettingsInput,
): Required<GoogleIntegrationSettingsInput> {
  return {
    sheetId: input.sheetId?.trim() ?? "",
    sheetRange: input.sheetRange?.trim() || defaultGoogleSheetRange,
    drivePhotoFolderId: input.drivePhotoFolderId?.trim() ?? "",
  };
}

export function joinGoogleScopes(scopes: readonly string[]): string {
  return scopes.join(" ");
}

export function splitGoogleScopes(scopes: string): string[] {
  return scopes
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

export function hasGooglePhotosPickerScope(scopes: readonly string[]): boolean {
  return scopes.includes(googlePhotosPickerScope);
}

export function getGoogleIntegrationLabel(
  status: Pick<GoogleIntegrationStatus, "configured" | "connected">,
): string {
  if (!status.configured) {
    return "未設定";
  }

  return status.connected ? "已連接" : "未連接";
}

export function getGoogleIntegrationHref(): string {
  return "/integrations/google";
}

export function getGoogleAuthStartHref(): string {
  return "/auth/google/start";
}

export function getGoogleAuthCallbackHref(): string {
  return "/auth/google/callback";
}

export function getAnimeImageHref(sceneId: string): string {
  return `/api/scenes/${sceneId}/anime-image`;
}
