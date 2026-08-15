import { randomUUID } from "node:crypto";
import {
  GoogleApiError,
  getGoogleFetch,
  googleFetchBytes,
  googleFetchJson,
} from "@/infrastructure/google/google-http";

const googlePhotosPickerEndpoint = "https://photospicker.googleapis.com/v1";
const pickerAutoCloseSuffix = "/autoclose";

export interface GooglePhotosPickerSession {
  id: string;
  pickerUri: string;
  pollingConfig?: {
    pollInterval?: string;
    timeoutIn?: string;
  };
  expireTime?: string;
  mediaItemsSet?: boolean;
}

export interface GooglePhotosPickedMediaItem {
  id: string;
  createTime?: string;
  type?: "PHOTO" | "VIDEO" | "TYPE_UNSPECIFIED" | string;
  mediaFile?: {
    baseUrl?: string;
    mimeType?: string;
    filename?: string;
    mediaFileMetadata?: {
      width?: number;
      height?: number;
      cameraMake?: string;
      cameraModel?: string;
      photoMetadata?: unknown;
      videoMetadata?: unknown;
    };
  };
}

interface GooglePhotosMediaItemsListResponse {
  mediaItems?: GooglePhotosPickedMediaItem[];
  nextPageToken?: string;
}

export interface CreateGooglePhotosPickerSessionInput {
  accessToken: string;
  maxItemCount?: number;
}

export async function createGooglePhotosPickerSession({
  accessToken,
  maxItemCount = 1,
}: CreateGooglePhotosPickerSessionInput): Promise<GooglePhotosPickerSession> {
  const url = new URL(`${googlePhotosPickerEndpoint}/sessions`);
  url.searchParams.set("requestId", randomUUID());

  const session = await googleFetchJson<GooglePhotosPickerSession>(url, {
    method: "POST",
    headers: buildGooglePhotosPickerHeaders(accessToken),
    body: JSON.stringify({
      pickingConfig: {
        maxItemCount: `${maxItemCount}`,
      },
    }),
  });

  return {
    ...session,
    pickerUri: appendPickerAutoClose(session.pickerUri),
  };
}

export async function getGooglePhotosPickerSession(
  sessionId: string,
  accessToken: string,
): Promise<GooglePhotosPickerSession> {
  assertSessionId(sessionId);

  return googleFetchJson<GooglePhotosPickerSession>(
    `${googlePhotosPickerEndpoint}/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: buildGooglePhotosPickerHeaders(accessToken),
    },
  );
}

export async function deleteGooglePhotosPickerSession(
  sessionId: string,
  accessToken: string,
): Promise<void> {
  assertSessionId(sessionId);

  const response = await getGoogleFetch()(
    `${googlePhotosPickerEndpoint}/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
      headers: buildGooglePhotosPickerHeaders(accessToken),
    },
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new GoogleApiError(
      `Google Photos Picker session delete failed: ${response.status}`,
      response.status,
      await readResponseBody(response),
    );
  }
}

export async function listGooglePhotosPickedMediaItems(
  sessionId: string,
  accessToken: string,
): Promise<GooglePhotosPickedMediaItem[]> {
  assertSessionId(sessionId);

  const mediaItems: GooglePhotosPickedMediaItem[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${googlePhotosPickerEndpoint}/mediaItems`);
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageSize", "100");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const page = await googleFetchJson<GooglePhotosMediaItemsListResponse>(
      url,
      {
        method: "GET",
        headers: buildGooglePhotosPickerHeaders(accessToken),
      },
    );

    mediaItems.push(...(page.mediaItems ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return mediaItems;
}

export async function downloadGooglePhotosPickedImage(
  mediaItem: GooglePhotosPickedMediaItem,
  accessToken: string,
): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  capturedAt?: Date;
}> {
  const mediaFile = mediaItem.mediaFile;
  const baseUrl = mediaFile?.baseUrl?.trim();
  const mimeType = mediaFile?.mimeType?.trim() ?? "";
  const fileName = mediaFile?.filename?.trim() || `${mediaItem.id}.jpg`;

  if (!baseUrl) {
    throw new GoogleApiError(
      "Google Photos picked media item did not include a baseUrl.",
      400,
    );
  }

  const downloaded = await googleFetchBytes(`${baseUrl}=d`, {
    method: "GET",
    headers: buildGooglePhotosPickerHeaders(accessToken),
  });

  return {
    bytes: downloaded.bytes,
    mimeType: mimeType || downloaded.contentType,
    fileName,
    capturedAt: parseGooglePhotosCreateTime(mediaItem.createTime),
  };
}

function buildGooglePhotosPickerHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function appendPickerAutoClose(pickerUri: string): string {
  if (pickerUri.endsWith(pickerAutoCloseSuffix)) {
    return pickerUri;
  }

  return `${pickerUri.replace(/\/$/, "")}${pickerAutoCloseSuffix}`;
}

function parseGooglePhotosCreateTime(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function assertSessionId(sessionId: string): void {
  if (sessionId.trim().length === 0) {
    throw new GoogleApiError(
      "Google Photos Picker session ID is required.",
      400,
    );
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}
