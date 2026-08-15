import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { decryptGoogleToken } from "@/infrastructure/google/token-crypto";
import {
  googleOAuthScopes,
  joinGoogleScopes,
} from "@/application/google-integration";
import {
  setGoogleFetch,
  type GoogleFetch,
} from "@/infrastructure/google/google-http";
import {
  createGoogleSessionForAccount,
  createGoogleSessionFromTokens,
  getGoogleAccessTokenForSession,
  logoutGoogleSession,
  revokeGoogleAccountForSession,
} from "@/infrastructure/repositories/google-integration-repository";
import {
  createGooglePhotosPickerSessionForAccount,
  getGooglePhotosPickerSessionForAccount,
  importGooglePhotosPickedMediaItem,
} from "@/infrastructure/repositories/google-photos-picker-repository";
import {
  commitSceneImportGoogleSheet,
  previewSceneImportGoogleSheet,
} from "@/infrastructure/repositories/scene-import-repository";
import {
  readScenePhotoBytes,
  uploadScenePhoto,
} from "@/infrastructure/repositories/scene-photo-repository";
import { readAnimeImageForScene } from "@/infrastructure/repositories/anime-image-repository";
import { setPhotoStorage } from "@/infrastructure/storage/local-photo-storage";
import { prisma } from "@/infrastructure/database/prisma";

const pngBytes = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const originalEnv = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  GOOGLE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
  PHOTO_STORAGE_BACKEND: process.env.PHOTO_STORAGE_BACKEND,
};

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI =
    "http://localhost:3000/auth/google/callback";
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY =
    "integration-google-token-encryption-key";
  process.env.PHOTO_STORAGE_BACKEND = "local";
  setPhotoStorage(undefined);
  setGoogleFetch(createGoogleFetchMock());
});

afterEach(async () => {
  setGoogleFetch(undefined);
  setPhotoStorage(undefined);
  restoreEnv();

  await prisma.scenePhoto.deleteMany();
  await prisma.scene.update({
    where: { id: "scene-bhc-001" },
    data: {
      animeImageDriveFileId: "demo-drive-bhc-001",
      status: "NOT_SHOT",
    },
  });
  await prisma.scene.deleteMany({
    where: { work: { shortCode: "GGL" } },
  });
  await prisma.location.deleteMany({
    where: { name: "Google Sheet Station", areaName: "Mock Area" },
  });
  await prisma.work.deleteMany({ where: { shortCode: "GGL" } });
  await prisma.googleSession.deleteMany();
  await prisma.googleAccount.deleteMany();
  await prisma.googleIntegrationSettings.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("google oauth session repository", () => {
  it("stores encrypted tokens and hashed sessions", async () => {
    const result = await createGoogleSession();
    const account = await prisma.googleAccount.findUniqueOrThrow({
      where: { googleSubject: "google-user-1" },
    });
    const session = await prisma.googleSession.findFirstOrThrow({
      where: { accountId: account.id },
    });

    expect(result.account.email).toBe("google-user@example.test");
    expect(account.encryptedAccessToken).not.toContain("access-token");
    expect(account.encryptedRefreshToken).not.toContain("refresh-token");
    expect(decryptGoogleToken(account.encryptedAccessToken)).toBe(
      "access-token",
    );
    expect(session.sessionTokenHash).not.toBe(result.sessionToken);
  });

  it("refreshes expired access tokens", async () => {
    const result = await createGoogleSession({ expiresIn: -60 });

    await expect(
      getGoogleAccessTokenForSession(result.sessionToken),
    ).resolves.toBe("refreshed-access-token");

    const account = await prisma.googleAccount.findUniqueOrThrow({
      where: { googleSubject: "google-user-1" },
    });
    expect(decryptGoogleToken(account.encryptedAccessToken)).toBe(
      "refreshed-access-token",
    );
  });

  it("rejects logged out and revoked sessions", async () => {
    const first = await createGoogleSession();
    await logoutGoogleSession(first.sessionToken);
    await expect(
      getGoogleAccessTokenForSession(first.sessionToken),
    ).rejects.toThrow("Google session is missing or expired.");

    const second = await createGoogleSession();
    await revokeGoogleAccountForSession(second.sessionToken);
    await expect(
      getGoogleAccessTokenForSession(second.sessionToken),
    ).rejects.toThrow("Google session is missing or expired.");
  });

  it("creates another app session for an existing Google account", async () => {
    const first = await createGoogleSession();
    const paired = await createGoogleSessionForAccount(first.account.id);

    expect(paired.account.email).toBe("google-user@example.test");
    expect(paired.sessionToken).not.toBe(first.sessionToken);
    await expect(
      getGoogleAccessTokenForSession(paired.sessionToken),
    ).resolves.toBe("access-token");
  });
});

describe("google sheets scene import", () => {
  it("previews and commits a mocked Sheet through the shared import path", async () => {
    const session = await createGoogleSession();

    const preview = await previewSceneImportGoogleSheet({
      googleSessionToken: session.sessionToken,
      sheetId: "sheet-123",
      sheetRange: "Sheet1!A:K",
    });

    expect(preview.canCommit).toBe(true);
    expect(preview.rows.map((row) => row.sceneCode)).toEqual(["GGL-201"]);

    const result = await commitSceneImportGoogleSheet({
      googleSessionToken: session.sessionToken,
      sheetId: "sheet-123",
      sheetRange: "Sheet1!A:K",
    });
    const scene = await prisma.scene.findUniqueOrThrow({
      where: { sceneCode: "GGL-201" },
    });

    expect(result.ok).toBe(true);
    expect(scene.animeImageDriveFileId).toBe("mock-anime-drive-file");
    expect(scene.mapsUrl).toBe("https://maps.app.goo.gl/mock-sheet");
  });
});

describe("google drive adapters", () => {
  it("reads anime image bytes through the Drive adapter", async () => {
    const session = await createGoogleSession();
    await prisma.scene.update({
      where: { id: "scene-bhc-001" },
      data: { animeImageDriveFileId: "mock-anime-drive-file" },
    });

    const image = await readAnimeImageForScene(
      "scene-bhc-001",
      session.sessionToken,
    );

    expect(image.mimeType).toBe("image/png");
    expect(Buffer.from(image.bytes)).toEqual(Buffer.from(pngBytes));
  });

  it("normalizes existing Drive links before reading anime image bytes", async () => {
    const session = await createGoogleSession();
    await prisma.scene.update({
      where: { id: "scene-bhc-001" },
      data: {
        animeImageDriveFileId:
          "https://drive.google.com/file/d/mock-anime-drive-file/view?usp=drive_link",
      },
    });

    const image = await readAnimeImageForScene(
      "scene-bhc-001",
      session.sessionToken,
    );

    expect(image.driveFileId).toBe("mock-anime-drive-file");
    expect(image.mimeType).toBe("image/png");
    expect(Buffer.from(image.bytes)).toEqual(Buffer.from(pngBytes));
  });

  it("resolves Drive shortcuts before reading anime image bytes", async () => {
    const session = await createGoogleSession();
    await prisma.scene.update({
      where: { id: "scene-bhc-001" },
      data: {
        animeImageDriveFileId: "mock-shortcut-file",
      },
    });

    const image = await readAnimeImageForScene(
      "scene-bhc-001",
      session.sessionToken,
    );

    expect(image.driveFileId).toBe("mock-anime-drive-file");
    expect(image.fileName).toBe("mock-anime.png");
    expect(image.mimeType).toBe("image/png");
  });

  it("stores uploaded photos with the returned Drive file id", async () => {
    process.env.PHOTO_STORAGE_BACKEND = "google-drive";
    setPhotoStorage(undefined);
    const session = await createGoogleSession();

    const uploaded = await uploadScenePhoto({
      sceneId: "scene-bhc-001",
      fileName: "drive-photo.png",
      mimeType: "image/png",
      bytes: pngBytes,
      googleSessionToken: session.sessionToken,
    });
    const row = await prisma.scenePhoto.findUniqueOrThrow({
      where: { id: uploaded.photo.id },
    });

    expect(row.storageFileId).toBe("drive-photo-1");
    await expect(
      readScenePhotoBytes(uploaded.photo.id, session.sessionToken),
    ).resolves.toMatchObject({
      mimeType: "image/png",
      fileName: "drive-photo.png",
    });
  });

  it("rolls back the database row when Drive storage fails", async () => {
    process.env.PHOTO_STORAGE_BACKEND = "google-drive";
    setPhotoStorage(undefined);
    setGoogleFetch(createGoogleFetchMock({ failDriveUpload: true }));
    const session = await createGoogleSession();

    await expect(
      uploadScenePhoto({
        sceneId: "scene-bhc-001",
        fileName: "drive-photo.png",
        mimeType: "image/png",
        bytes: pngBytes,
        googleSessionToken: session.sessionToken,
      }),
    ).rejects.toThrow("Failed to upload photo to Google Drive.");

    await expect(prisma.scenePhoto.count()).resolves.toBe(0);
    await expect(
      prisma.scene.findUnique({
        where: { id: "scene-bhc-001" },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: "NOT_SHOT" });
  });
});

describe("google photos picker import", () => {
  it("imports a picked Google Photos image into Drive-backed ScenePhoto storage", async () => {
    process.env.PHOTO_STORAGE_BACKEND = "google-drive";
    setPhotoStorage(undefined);
    const session = await createGoogleSession();

    const picker = await createGooglePhotosPickerSessionForAccount(
      session.sessionToken,
    );
    const picked = await getGooglePhotosPickerSessionForAccount(
      session.sessionToken,
      picker.sessionId,
    );

    expect(picker.pickerUri).toBe(
      "https://photos.google.com/picker/mock-session/autoclose",
    );
    expect(picked.mediaItems).toEqual([
      {
        id: "google-photo-1",
        fileName: "google-photo.png",
        mimeType: "image/png",
        type: "PHOTO",
        createTime: "2026-10-10T09:15:00Z",
      },
    ]);

    const imported = await importGooglePhotosPickedMediaItem({
      googleSessionToken: session.sessionToken,
      sceneId: "scene-bhc-001",
      pickerSessionId: picker.sessionId,
    });
    const row = await prisma.scenePhoto.findUniqueOrThrow({
      where: { id: imported.photo.id },
    });

    expect(imported.photo.fileName).toBe("google-photo.png");
    expect(imported.photo.capturedAt).toBe("2026-10-10T09:15:00.000Z");
    expect(imported.status).toBe("PENDING_REVIEW");
    expect(row.storageFileId).toBe("drive-photo-1");
    await expect(
      readScenePhotoBytes(imported.photo.id, session.sessionToken),
    ).resolves.toMatchObject({
      mimeType: "image/png",
      fileName: "google-photo.png",
    });
  });

  it("rejects Google Photos import when storage would fall back to local disk", async () => {
    const session = await createGoogleSession();

    await expect(
      importGooglePhotosPickedMediaItem({
        googleSessionToken: session.sessionToken,
        sceneId: "scene-bhc-001",
        pickerSessionId: "picker-session-1",
      }),
    ).rejects.toMatchObject({
      name: "GooglePhotosImportError",
      code: "storage_backend",
    });

    await expect(prisma.scenePhoto.count()).resolves.toBe(0);
  });
});

async function createGoogleSession(input: { expiresIn?: number } = {}) {
  return createGoogleSessionFromTokens(
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: input.expiresIn ?? 3600,
      scope: joinGoogleScopes(googleOAuthScopes),
    },
    {
      sub: "google-user-1",
      email: "google-user@example.test",
      name: "Google User",
    },
  );
}

function createGoogleFetchMock(
  options: { failDriveUpload?: boolean } = {},
): GoogleFetch {
  let drivePhotoCounter = 0;

  return async (input, init) => {
    const url = new URL(String(input));

    if (url.hostname === "oauth2.googleapis.com" && url.pathname === "/token") {
      return jsonResponse({
        access_token: "refreshed-access-token",
        expires_in: 3600,
      });
    }

    if (
      url.hostname === "oauth2.googleapis.com" &&
      url.pathname === "/revoke"
    ) {
      return jsonResponse({});
    }

    if (url.hostname === "sheets.googleapis.com") {
      return jsonResponse({
        values: [
          [
            "scene_code",
            "work_name",
            "work_short_code",
            "episode",
            "anime_drive_file_id",
            "location_name",
            "area_name",
            "latitude",
            "longitude",
            "maps_url",
            "notes",
          ],
          [
            "GGL-201",
            "Google Sheet Story",
            "GGL",
            "01",
            "https://drive.google.com/file/d/mock-anime-drive-file/view?usp=drive_link",
            "Google Sheet Station",
            "Mock Area",
            "",
            "",
            "https://maps.app.goo.gl/mock-sheet",
            "Mock Sheet import",
          ],
        ],
      });
    }

    if (
      url.hostname === "www.googleapis.com" &&
      url.pathname.startsWith("/upload/drive/v3/files")
    ) {
      if (options.failDriveUpload) {
        return jsonResponse({ error: { message: "Drive unavailable." } }, 500);
      }

      drivePhotoCounter += 1;
      return jsonResponse({
        id: `drive-photo-${drivePhotoCounter}`,
        name: "drive-photo.png",
        mimeType: "image/png",
        size: `${pngBytes.byteLength}`,
      });
    }

    if (
      url.hostname === "www.googleapis.com" &&
      url.pathname.startsWith("/drive/v3/files/")
    ) {
      const fileId = decodeURIComponent(url.pathname.split("/").pop() ?? "");

      if (init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      if (fileId.startsWith("drive-photo-")) {
        if (url.searchParams.get("alt") === "media") {
          return new Response(pngBytes, {
            status: 200,
            headers: { "Content-Type": "image/png" },
          });
        }

        return jsonResponse({
          id: fileId,
          name: "drive-photo.png",
          mimeType: "image/png",
          size: `${pngBytes.byteLength}`,
        });
      }

      if (fileId !== "mock-anime-drive-file") {
        if (fileId === "mock-shortcut-file") {
          return jsonResponse({
            id: "mock-shortcut-file",
            name: "mock-shortcut",
            mimeType: "application/vnd.google-apps.shortcut",
            shortcutDetails: {
              targetId: "mock-anime-drive-file",
              targetMimeType: "image/png",
              targetResourceKey: "mock-target-resource-key",
            },
          });
        }

        return jsonResponse(
          { error: { message: `Unexpected Drive file id: ${fileId}` } },
          404,
        );
      }

      if (url.searchParams.get("alt") === "media") {
        return new Response(pngBytes, {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }

      return jsonResponse({
        id: "mock-anime-drive-file",
        name: "mock-anime.png",
        mimeType: "image/png",
        size: `${pngBytes.byteLength}`,
      });
    }

    if (
      url.hostname === "photospicker.googleapis.com" &&
      url.pathname === "/v1/sessions" &&
      init?.method === "POST"
    ) {
      return jsonResponse({
        id: "picker-session-1",
        pickerUri: "https://photos.google.com/picker/mock-session",
        mediaItemsSet: false,
        pollingConfig: {
          pollInterval: "0.1s",
          timeoutIn: "30s",
        },
      });
    }

    if (
      url.hostname === "photospicker.googleapis.com" &&
      url.pathname === "/v1/sessions/picker-session-1"
    ) {
      if (init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return jsonResponse({
        id: "picker-session-1",
        pickerUri: "https://photos.google.com/picker/mock-session",
        mediaItemsSet: true,
      });
    }

    if (
      url.hostname === "photospicker.googleapis.com" &&
      url.pathname === "/v1/mediaItems"
    ) {
      return jsonResponse({
        mediaItems: [
          {
            id: "google-photo-1",
            createTime: "2026-10-10T09:15:00Z",
            type: "PHOTO",
            mediaFile: {
              baseUrl: "https://lh3.googleusercontent.com/p/mock-google-photo",
              mimeType: "image/png",
              filename: "google-photo.png",
            },
          },
        ],
      });
    }

    if (
      url.hostname === "lh3.googleusercontent.com" &&
      url.pathname === "/p/mock-google-photo=d"
    ) {
      return new Response(pngBytes, {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }

    return jsonResponse({ error: { message: url.toString() } }, 500);
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
