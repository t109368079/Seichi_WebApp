import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildStorageFileName } from "@/domain/scene-photo";
import { GoogleDrivePhotoStorage } from "@/infrastructure/storage/google-drive-photo-storage";
import {
  PhotoNotFoundError,
  PhotoStorageError,
  type PhotoStorageAdapter,
  type ReadPhotoResult,
  type SavePhotoInput,
  type StoredPhotoDescriptor,
} from "@/infrastructure/storage/photo-storage";

const defaultStorageDirectory = path.join("storage", "scene-photos");

export function getPhotoStorageDirectory(): string {
  const configured = process.env.PHOTO_STORAGE_DIR?.trim();

  return path.resolve(
    configured && configured.length > 0 ? configured : defaultStorageDirectory,
  );
}

export class LocalPhotoStorage implements PhotoStorageAdapter {
  constructor(
    private readonly directory: string = getPhotoStorageDirectory(),
  ) {}

  async save(input: SavePhotoInput): Promise<StoredPhotoDescriptor> {
    const target = this.resolvePath(input);

    try {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, input.bytes);
      return {
        storageFileId: input.storageFileId,
        mimeType: input.mimeType,
      };
    } catch (error) {
      throw new PhotoStorageError(
        `Failed to store photo ${input.storageFileId}.`,
        { cause: error },
      );
    }
  }

  async read(descriptor: StoredPhotoDescriptor): Promise<ReadPhotoResult> {
    try {
      return {
        bytes: await readFile(this.resolvePath(descriptor)),
        mimeType: descriptor.mimeType,
      };
    } catch (error) {
      if (isNotFound(error)) {
        throw new PhotoNotFoundError(descriptor.storageFileId);
      }

      throw new PhotoStorageError(
        `Failed to read photo ${descriptor.storageFileId}.`,
        { cause: error },
      );
    }
  }

  /**
   * Deleting an already-absent file succeeds. Removal runs as compensation for
   * failed uploads, so it must be safe to call when nothing was written.
   */
  async delete(descriptor: StoredPhotoDescriptor): Promise<void> {
    try {
      await rm(this.resolvePath(descriptor), { force: true });
    } catch (error) {
      throw new PhotoStorageError(
        `Failed to delete photo ${descriptor.storageFileId}.`,
        { cause: error },
      );
    }
  }

  private resolvePath(descriptor: StoredPhotoDescriptor): string {
    const fileName = buildStorageFileName(
      descriptor.storageFileId,
      descriptor.mimeType,
    );
    const target = path.resolve(this.directory, fileName);

    // storageFileId is generated server side, but a traversal guard keeps a
    // future caller from turning it into an arbitrary filesystem write.
    if (path.dirname(target) !== path.resolve(this.directory)) {
      throw new PhotoStorageError(
        `Invalid storage file id: ${descriptor.storageFileId}`,
      );
    }

    return target;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

let defaultAdapter: PhotoStorageAdapter | undefined;

export function getPhotoStorage(sessionToken?: string): PhotoStorageAdapter {
  if (defaultAdapter) {
    return defaultAdapter;
  }

  if (process.env.PHOTO_STORAGE_BACKEND === "google-drive") {
    return new GoogleDrivePhotoStorage(sessionToken);
  }

  defaultAdapter = new LocalPhotoStorage();

  return defaultAdapter;
}

/** Test seam for injecting a failing or in-memory adapter. */
export function setPhotoStorage(
  adapter: PhotoStorageAdapter | undefined,
): void {
  defaultAdapter = adapter;
}
