import type { PhotoMimeType } from "@/domain/scene-photo";

export interface StoredPhotoDescriptor {
  storageFileId: string;
  mimeType: PhotoMimeType;
}

export interface SavePhotoInput extends StoredPhotoDescriptor {
  bytes: Uint8Array;
  fileName?: string;
}

export interface ReadPhotoResult {
  bytes: Uint8Array;
  mimeType: PhotoMimeType;
}

/**
 * The boundary Phase 8 replaces with a Google Drive implementation. Nothing
 * above this interface knows where photo bytes physically live; the database
 * only ever stores `storageFileId`.
 */
export interface PhotoStorageAdapter {
  save(input: SavePhotoInput): Promise<StoredPhotoDescriptor>;
  read(descriptor: StoredPhotoDescriptor): Promise<ReadPhotoResult>;
  delete(descriptor: StoredPhotoDescriptor): Promise<void>;
}

export class PhotoStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PhotoStorageError";
  }
}

export class PhotoNotFoundError extends PhotoStorageError {
  constructor(storageFileId: string) {
    super(`Stored photo not found: ${storageFileId}`);
    this.name = "PhotoNotFoundError";
  }
}
