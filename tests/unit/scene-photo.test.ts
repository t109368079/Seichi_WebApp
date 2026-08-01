import { describe, expect, it } from "vitest";
import { sceneStatuses, type SceneStatus } from "@/domain/scene";
import {
  assertUploadablePhoto,
  buildStorageFileName,
  getNextTakeNumber,
  getPhotoFileExtension,
  isAllowedPhotoMimeType,
  isPhotoStatusChangeAllowed,
  maxPhotoFileSizeBytes,
  resolveStatusAfterPhotoRemoval,
  resolveStatusAfterUpload,
} from "@/domain/scene-photo";

function candidate(
  overrides: Partial<Parameters<typeof assertUploadablePhoto>[0]> = {},
) {
  return {
    fileName: "IMG_0001.jpg",
    mimeType: "image/jpeg",
    fileSize: 2048,
    ...overrides,
  };
}

describe("photo file validation", () => {
  it("accepts the three supported image types", () => {
    for (const mimeType of ["image/jpeg", "image/png", "image/webp"]) {
      expect(isAllowedPhotoMimeType(mimeType)).toBe(true);
      expect(assertUploadablePhoto(candidate({ mimeType }))).toBe(mimeType);
    }
  });

  it("rejects unsupported image and non-image types", () => {
    for (const mimeType of ["image/gif", "image/heic", "text/plain", ""]) {
      expect(isAllowedPhotoMimeType(mimeType)).toBe(false);
      expect(() => assertUploadablePhoto(candidate({ mimeType }))).toThrow(
        `Unsupported photo type: ${mimeType}`,
      );
    }
  });

  it("requires a file name", () => {
    expect(() => assertUploadablePhoto(candidate({ fileName: "   " }))).toThrow(
      "Photo fileName is required.",
    );
  });

  it("rejects empty files", () => {
    expect(() => assertUploadablePhoto(candidate({ fileSize: 0 }))).toThrow(
      "Photo file is empty.",
    );
    expect(() => assertUploadablePhoto(candidate({ fileSize: -1 }))).toThrow(
      "Photo file is empty.",
    );
  });

  it("accepts a file exactly at the limit and rejects one byte more", () => {
    expect(
      assertUploadablePhoto(candidate({ fileSize: maxPhotoFileSizeBytes })),
    ).toBe("image/jpeg");
    expect(() =>
      assertUploadablePhoto(candidate({ fileSize: maxPhotoFileSizeBytes + 1 })),
    ).toThrow("upload limit");
  });

  it("maps mime types to stored file extensions", () => {
    expect(getPhotoFileExtension("image/jpeg")).toBe("jpg");
    expect(getPhotoFileExtension("image/png")).toBe("png");
    expect(getPhotoFileExtension("image/webp")).toBe("webp");
    expect(buildStorageFileName("abc-123", "image/png")).toBe("abc-123.png");
  });
});

describe("take numbering", () => {
  it("starts at 1 for a scene with no photos", () => {
    expect(getNextTakeNumber([])).toBe(1);
  });

  it("appends past the current maximum", () => {
    expect(getNextTakeNumber([{ takeNumber: 1 }, { takeNumber: 2 }])).toBe(3);
  });

  it("never reuses a number after a middle take is deleted", () => {
    expect(getNextTakeNumber([{ takeNumber: 1 }, { takeNumber: 3 }])).toBe(4);
  });

  it("ignores ordering of the existing takes", () => {
    expect(getNextTakeNumber([{ takeNumber: 5 }, { takeNumber: 2 }])).toBe(6);
  });
});

describe("status after upload", () => {
  it("moves an unshot scene to pending review", () => {
    expect(resolveStatusAfterUpload("NOT_SHOT")).toBe("PENDING_REVIEW");
  });

  it("moves a retake required scene back to pending review", () => {
    expect(resolveStatusAfterUpload("RETAKE_REQUIRED")).toBe("PENDING_REVIEW");
  });

  it("leaves every other status untouched", () => {
    expect(resolveStatusAfterUpload("PENDING_REVIEW")).toBe("PENDING_REVIEW");
    expect(resolveStatusAfterUpload("SKIPPED")).toBe("SKIPPED");
    expect(resolveStatusAfterUpload("REVIEWED")).toBe("REVIEWED");
  });

  it("only produces transitions the phase 5 table already allows", () => {
    for (const status of sceneStatuses) {
      const next = resolveStatusAfterUpload(status);

      expect(isPhotoStatusChangeAllowed(status, next)).toBe(true);
    }
  });
});

describe("status after photo removal", () => {
  it("keeps the status while any take remains", () => {
    for (const status of sceneStatuses) {
      expect(resolveStatusAfterPhotoRemoval(status, 1)).toBe(status);
    }
  });

  it("returns pending review to not shot once the last take is gone", () => {
    expect(resolveStatusAfterPhotoRemoval("PENDING_REVIEW", 0)).toBe(
      "NOT_SHOT",
    );
  });

  it("leaves other statuses unchanged when the last take is gone", () => {
    const untouched: SceneStatus[] = [
      "NOT_SHOT",
      "SKIPPED",
      "REVIEWED",
      "RETAKE_REQUIRED",
    ];

    for (const status of untouched) {
      expect(resolveStatusAfterPhotoRemoval(status, 0)).toBe(status);
    }
  });

  it("only produces transitions the phase 5 table already allows", () => {
    for (const status of sceneStatuses) {
      const next = resolveStatusAfterPhotoRemoval(status, 0);

      expect(isPhotoStatusChangeAllowed(status, next)).toBe(true);
    }
  });
});
