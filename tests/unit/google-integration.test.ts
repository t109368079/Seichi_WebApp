import { afterEach, describe, expect, it } from "vitest";
import {
  getGoogleIntegrationLabel,
  googleOAuthScopes,
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
