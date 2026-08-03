import { buildStorageFileName } from "@/domain/scene-photo";
import {
  deleteGoogleDriveFile,
  downloadGoogleDriveFile,
  uploadGoogleDriveFile,
} from "@/infrastructure/google/google-drive";
import {
  getGoogleAccessTokenForSession,
  getGoogleIntegrationSettings,
  GoogleSessionError,
} from "@/infrastructure/repositories/google-integration-repository";
import {
  PhotoNotFoundError,
  PhotoStorageError,
  type PhotoStorageAdapter,
  type ReadPhotoResult,
  type SavePhotoInput,
  type StoredPhotoDescriptor,
} from "@/infrastructure/storage/photo-storage";

export class GoogleDrivePhotoStorage implements PhotoStorageAdapter {
  constructor(private readonly sessionToken?: string) {}

  async save(input: SavePhotoInput): Promise<StoredPhotoDescriptor> {
    const accessToken = await this.getAccessToken();
    const settings = await getGoogleIntegrationSettings();

    try {
      const uploaded = await uploadGoogleDriveFile({
        accessToken,
        fileName:
          input.fileName ??
          buildStorageFileName(input.storageFileId, input.mimeType),
        mimeType: input.mimeType,
        bytes: input.bytes,
        folderId: settings.drivePhotoFolderId || undefined,
      });

      return {
        storageFileId: uploaded.id,
        mimeType: input.mimeType,
      };
    } catch (error) {
      throw new PhotoStorageError("Failed to upload photo to Google Drive.", {
        cause: error,
      });
    }
  }

  async read(descriptor: StoredPhotoDescriptor): Promise<ReadPhotoResult> {
    const accessToken = await this.getAccessToken();

    try {
      const downloaded = await downloadGoogleDriveFile(
        descriptor.storageFileId,
        accessToken,
      );

      return {
        bytes: downloaded.bytes,
        mimeType: descriptor.mimeType,
      };
    } catch (error) {
      if (isGoogleNotFound(error)) {
        throw new PhotoNotFoundError(descriptor.storageFileId);
      }

      throw new PhotoStorageError("Failed to read photo from Google Drive.", {
        cause: error,
      });
    }
  }

  async delete(descriptor: StoredPhotoDescriptor): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await deleteGoogleDriveFile(descriptor.storageFileId, accessToken);
    } catch (error) {
      throw new PhotoStorageError("Failed to delete photo from Google Drive.", {
        cause: error,
      });
    }
  }

  private async getAccessToken(): Promise<string> {
    if (!this.sessionToken) {
      throw new PhotoStorageError(
        "Google Drive photo storage requires a Google session.",
      );
    }

    try {
      return await getGoogleAccessTokenForSession(this.sessionToken);
    } catch (error) {
      if (error instanceof GoogleSessionError) {
        throw new PhotoStorageError(error.message, { cause: error });
      }

      throw error;
    }
  }
}

function isGoogleNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 404
  );
}
