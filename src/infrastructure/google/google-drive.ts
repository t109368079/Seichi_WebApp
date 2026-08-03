import { randomUUID } from "node:crypto";
import {
  getGoogleFetch,
  GoogleApiError,
  googleFetchBytes,
  googleFetchJson,
} from "@/infrastructure/google/google-http";

const driveFilesEndpoint = "https://www.googleapis.com/drive/v3/files";
const driveUploadEndpoint = "https://www.googleapis.com/upload/drive/v3/files";

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export interface GoogleDriveUploadInput {
  accessToken: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  folderId?: string;
}

export async function getGoogleDriveFileMetadata(
  fileId: string,
  accessToken: string,
): Promise<GoogleDriveFileMetadata> {
  const url = new URL(`${driveFilesEndpoint}/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,size");

  return googleFetchJson<GoogleDriveFileMetadata>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function downloadGoogleDriveFile(
  fileId: string,
  accessToken: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const url = new URL(`${driveFilesEndpoint}/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  const downloaded = await googleFetchBytes(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return {
    bytes: downloaded.bytes,
    mimeType: downloaded.contentType,
  };
}

export async function uploadGoogleDriveFile(
  input: GoogleDriveUploadInput,
): Promise<GoogleDriveFileMetadata> {
  const boundary = `seichi_${randomUUID().replace(/-/g, "")}`;
  const metadata = {
    name: input.fileName,
    mimeType: input.mimeType,
    parents: input.folderId ? [input.folderId] : undefined,
  };
  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata,
    )}\r\n`,
    "utf8",
  );
  const mediaHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
    "utf8",
  );
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([
    metadataPart,
    mediaHeader,
    Buffer.from(input.bytes),
    closing,
  ]);
  const url = new URL(driveUploadEndpoint);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("fields", "id,name,mimeType,size");

  return googleFetchJson<GoogleDriveFileMetadata>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": `${body.byteLength}`,
    },
    body,
  });
}

export async function deleteGoogleDriveFile(
  fileId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetchWithAuth(
    `${driveFilesEndpoint}/${encodeURIComponent(fileId)}`,
    accessToken,
    { method: "DELETE" },
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new GoogleApiError(
      `Google Drive delete failed: ${response.status}`,
      response.status,
      await readResponseBody(response),
    );
  }
}

function fetchWithAuth(
  input: string,
  accessToken: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return getGoogleFetch()(input, {
    ...init,
    headers,
  });
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
