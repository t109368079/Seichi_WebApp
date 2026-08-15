import { afterEach, describe, expect, it } from "vitest";
import {
  getGoogleIntegrationLabel,
  googlePhotosPickerScope,
  googleOAuthScopes,
  hasGooglePhotosPickerScope,
  normalizeGoogleIntegrationSettings,
} from "@/application/google-integration";
import {
  decryptGoogleToken,
  encryptGoogleToken,
} from "@/infrastructure/google/token-crypto";
import {
  googleFetchJson,
  setGoogleFetch,
} from "@/infrastructure/google/google-http";
import {
  createGooglePhotosPickerSession,
  downloadGooglePhotosPickedImage,
} from "@/infrastructure/google/google-photos-picker";
import {
  consumeGoogleLanPairingToken,
  createGoogleLanPairingToken,
} from "@/infrastructure/google/google-lan-pairing";
import {
  buildGoogleIntegrationRedirectUrl,
  getAppRequestOrigin,
} from "@/infrastructure/google/google-request-url";

describe("google integration application helpers", () => {
  it("requests the Phase 8 OAuth scopes", () => {
    expect(googleOAuthScopes).toContain("openid");
    expect(googleOAuthScopes).toContain("email");
    expect(googleOAuthScopes).toContain(
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    );
    expect(googleOAuthScopes).toContain(
      "https://www.googleapis.com/auth/drive.readonly",
    );
    expect(googleOAuthScopes).toContain(
      "https://www.googleapis.com/auth/drive.file",
    );
    expect(googleOAuthScopes).toContain(googlePhotosPickerScope);
    expect(hasGooglePhotosPickerScope(googleOAuthScopes)).toBe(true);
  });

  it("normalizes saved integration settings", () => {
    expect(
      normalizeGoogleIntegrationSettings({
        sheetId: " sheet-123 ",
        sheetRange: "",
        drivePhotoFolderId: " folder-123 ",
      }),
    ).toEqual({
      sheetId: "sheet-123",
      sheetRange: "Sheet1!A:K",
      drivePhotoFolderId: "folder-123",
    });
  });

  it("labels configuration and connection state", () => {
    expect(
      getGoogleIntegrationLabel({ configured: false, connected: false }),
    ).toBe("未設定");
    expect(
      getGoogleIntegrationLabel({ configured: true, connected: false }),
    ).toBe("未連接");
    expect(
      getGoogleIntegrationLabel({ configured: true, connected: true }),
    ).toBe("已連接");
  });
});

describe("google photos picker adapter", () => {
  afterEach(() => {
    setGoogleFetch(undefined);
  });

  it("creates one-item picker sessions and appends autoclose", async () => {
    let requestBody: unknown;
    let requestUrl: URL | undefined;

    setGoogleFetch(async (input, init) => {
      requestUrl = new URL(String(input));
      requestBody = JSON.parse(String(init?.body ?? "{}")) as unknown;

      return new Response(
        JSON.stringify({
          id: "picker-session-1",
          pickerUri: "https://photos.google.com/picker/session-1",
          mediaItemsSet: false,
          pollingConfig: {
            pollInterval: "1.5s",
            timeoutIn: "30s",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const session = await createGooglePhotosPickerSession({
      accessToken: "access-token",
      maxItemCount: 1,
    });

    expect(requestUrl?.origin).toBe("https://photospicker.googleapis.com");
    expect(requestUrl?.pathname).toBe("/v1/sessions");
    expect(requestUrl?.searchParams.get("requestId")).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(requestBody).toEqual({
      pickingConfig: {
        maxItemCount: "1",
      },
    });
    expect(session.pickerUri).toBe(
      "https://photos.google.com/picker/session-1/autoclose",
    );
  });

  it("downloads picked images with the Photos download parameter", async () => {
    let requestedUrl = "";
    let requestedAuthorization = "";

    setGoogleFetch(async (input, init) => {
      requestedUrl = String(input);
      requestedAuthorization =
        new Headers(init?.headers).get("Authorization") ?? "";

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    });

    const downloaded = await downloadGooglePhotosPickedImage(
      {
        id: "media-1",
        createTime: "2026-10-10T09:30:00Z",
        type: "PHOTO",
        mediaFile: {
          baseUrl: "https://lh3.googleusercontent.com/p/mock-media",
          mimeType: "image/jpeg",
          filename: "IMG_0001.jpg",
        },
      },
      "access-token",
    );

    expect(requestedUrl).toBe(
      "https://lh3.googleusercontent.com/p/mock-media=d",
    );
    expect(requestedAuthorization).toBe("Bearer access-token");
    expect(downloaded).toMatchObject({
      bytes: Uint8Array.from([1, 2, 3]),
      mimeType: "image/jpeg",
      fileName: "IMG_0001.jpg",
      capturedAt: new Date("2026-10-10T09:30:00Z"),
    });
  });
});

describe("google token crypto", () => {
  it("encrypts tokens without storing plaintext and rejects the wrong key", () => {
    const encrypted = encryptGoogleToken("access-token", "test-secret");

    expect(encrypted).not.toContain("access-token");
    expect(decryptGoogleToken(encrypted, "test-secret")).toBe("access-token");
    expect(() => decryptGoogleToken(encrypted, "wrong-secret")).toThrow(
      "Unable to decrypt Google token.",
    );
  });
});

describe("google LAN pairing", () => {
  it("creates one-time LAN pairing tokens", () => {
    const pairing = createGoogleLanPairingToken("google-account-1");

    expect(pairing.token).toHaveLength(32);
    expect(consumeGoogleLanPairingToken(pairing.token)).toBe(
      "google-account-1",
    );
    expect(consumeGoogleLanPairingToken(pairing.token)).toBeUndefined();
  });
});

describe("google request URL helpers", () => {
  it("uses the browser host instead of the dev server bind address", () => {
    const request = new Request("http://0.0.0.0:3000/auth/google/callback", {
      headers: {
        host: "127.0.0.1:3000",
      },
    });

    expect(getAppRequestOrigin(request)).toBe("http://127.0.0.1:3000");
    expect(
      buildGoogleIntegrationRedirectUrl(request, "connected").toString(),
    ).toBe("http://127.0.0.1:3000/integrations/google?googleMessage=connected");
  });
});

describe("google http adapter", () => {
  afterEach(() => {
    setGoogleFetch(undefined);
  });

  it("translates Google error responses into GoogleApiError", async () => {
    setGoogleFetch(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "Permission denied.",
            },
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );

    await expect(
      googleFetchJson("https://example.test", { method: "GET" }),
    ).rejects.toMatchObject({
      name: "GoogleApiError",
      status: 403,
      message: "Permission denied.",
    });
  });
});
