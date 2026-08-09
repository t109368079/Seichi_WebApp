import {
  googleOAuthScopes,
  joinGoogleScopes,
} from "@/application/google-integration";
import type { GoogleFetch } from "@/infrastructure/google/google-http";

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const uploadedDriveFiles = new Map<
  string,
  { bytes: Uint8Array; mimeType: string; name: string }
>();

let uploadedDriveFileCounter = 0;

export const googleIntegrationTestFetch: GoogleFetch = async (input, init) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com" && url.pathname === "/token") {
    const body = parseFormBody(init?.body);
    const isRefresh = body.get("grant_type") === "refresh_token";

    return jsonResponse({
      access_token: isRefresh
        ? "mock-refreshed-access-token"
        : "mock-access-token",
      refresh_token: isRefresh ? undefined : "mock-refresh-token",
      expires_in: 3600,
      scope: joinGoogleScopes(googleOAuthScopes),
    });
  }

  if (url.hostname === "oauth2.googleapis.com" && url.pathname === "/revoke") {
    return jsonResponse({});
  }

  if (url.hostname === "openidconnect.googleapis.com") {
    return jsonResponse({
      sub: "mock-google-user",
      email: "mock@example.test",
      name: "Mock Google User",
      picture: "https://example.test/mock.png",
    });
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
          "GGL-101",
          "Google Test Story",
          "GGL",
          "01",
          "https://drive.google.com/file/d/mock-anime-drive-file/view?usp=drive_link",
          "Mock Station",
          "Mock Area",
          "",
          "",
          "https://maps.app.goo.gl/mock",
          "Imported from mocked Google Sheet",
        ],
      ],
    });
  }

  if (
    url.hostname === "www.googleapis.com" &&
    url.pathname.startsWith("/upload/drive/v3/files")
  ) {
    uploadedDriveFileCounter += 1;
    const id = `mock-drive-photo-${uploadedDriveFileCounter}`;
    uploadedDriveFiles.set(id, {
      bytes: new Uint8Array(),
      mimeType:
        (init?.headers
          ? readHeader(init.headers, "Content-Type")
          : undefined) ?? "image/png",
      name: id,
    });

    return jsonResponse({
      id,
      name: id,
      mimeType: "image/png",
      size: "0",
    });
  }

  if (
    url.hostname === "www.googleapis.com" &&
    url.pathname.startsWith("/drive/v3/files/")
  ) {
    const fileId = decodeURIComponent(url.pathname.split("/").pop() ?? "");

    if (init?.method === "DELETE") {
      uploadedDriveFiles.delete(fileId);
      return new Response(null, { status: 204 });
    }

    if (url.searchParams.get("alt") === "media") {
      const uploaded = uploadedDriveFiles.get(fileId);
      const bytes = uploaded?.bytes ?? pngBytes;

      return new Response(toArrayBuffer(bytes), {
        status: 200,
        headers: {
          "Content-Type": uploaded?.mimeType ?? "image/png",
        },
      });
    }

    return jsonResponse({
      id: fileId,
      name: `${fileId}.png`,
      mimeType: "image/png",
      size: `${pngBytes.byteLength}`,
    });
  }

  return jsonResponse(
    {
      error: {
        message: `Unhandled Google integration test URL: ${url.toString()}`,
      },
    },
    500,
  );
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function parseFormBody(body: BodyInit | null | undefined): URLSearchParams {
  if (body instanceof URLSearchParams) {
    return body;
  }

  return new URLSearchParams(typeof body === "string" ? body : "");
}

function readHeader(headers: HeadersInit, key: string): string | undefined {
  return new Headers(headers).get(key) ?? undefined;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = Buffer.from(bytes);

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
