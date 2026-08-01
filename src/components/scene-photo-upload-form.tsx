"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatPhotoFileSize,
  getMaxPhotoFileSizeLabel,
  getPhotoAcceptAttribute,
  getPhotoUploadEndpoint,
} from "@/application/scene-photo";
import {
  isAllowedPhotoMimeType,
  maxPhotoFileSizeBytes,
} from "@/domain/scene-photo";

export function ScenePhotoUploadForm({
  sceneId,
  sceneCode,
  tripId,
  tripDayId,
  tripSceneId,
}: {
  sceneId: string;
  sceneCode: string;
  tripId: string;
  tripDayId: string;
  tripSceneId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(undefined);

      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(selected: File | undefined) {
    setMessage(undefined);

    if (!selected) {
      setFile(undefined);

      return;
    }

    // Validated here as well as on the server so an unsupported file never
    // costs the user an upload over a mobile connection.
    if (!isAllowedPhotoMimeType(selected.type)) {
      setFile(undefined);
      setMessage("只接受 JPEG、PNG 或 WebP 格式的照片。");

      return;
    }

    if (selected.size > maxPhotoFileSizeBytes) {
      setFile(undefined);
      setMessage(`照片超過 ${getMaxPhotoFileSizeLabel()} 上傳上限。`);

      return;
    }

    setFile(selected);
  }

  function cancelSelection() {
    setFile(undefined);
    setMessage(undefined);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function upload() {
    if (!file || uploading) {
      return;
    }

    setUploading(true);
    setMessage(undefined);

    const formData = new FormData();
    formData.set("sceneId", sceneId);
    formData.set("tripId", tripId);
    formData.set("tripDayId", tripDayId);
    formData.set("photo", file);
    formData.set("capturedAt", new Date(file.lastModified).toISOString());

    try {
      const response = await fetch(getPhotoUploadEndpoint(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setMessage(body.message ?? "照片上傳失敗，場景狀態未變更。");
        setUploading(false);

        return;
      }

      router.push(`/field/${tripDayId}/${tripSceneId}`);
      router.refresh();
    } catch {
      setMessage("照片上傳失敗，請確認網路後重試。");
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded border border-field bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-field">
          上傳目標場景
        </p>
        <p className="mt-2 text-2xl font-semibold">{sceneCode}</p>
        <p className="mt-2 text-sm leading-6 text-night">
          照片會永久綁定這個場景，且不會覆蓋任何既有 Take。
        </p>
      </div>

      {message ? (
        <p
          role="alert"
          className="rounded border border-rail bg-white p-4 text-sm font-semibold text-night"
        >
          {message}
        </p>
      ) : null}

      <div className="rounded border border-rail bg-white p-5">
        <label htmlFor="scene-photo-input" className="text-base font-semibold">
          從本機相簿選取照片
        </label>
        <input
          ref={inputRef}
          id="scene-photo-input"
          type="file"
          name="photo"
          accept={getPhotoAcceptAttribute()}
          disabled={uploading}
          onChange={(event) => selectFile(event.target.files?.[0])}
          className="mt-3 block w-full text-base"
        />
        <p className="mt-3 text-sm leading-6 text-night">
          支援 JPEG、PNG、WebP，單張上限 {getMaxPhotoFileSizeLabel()}。
        </p>
      </div>

      {file && previewUrl ? (
        <div className="rounded border border-rail bg-white p-5">
          <h2 className="text-lg font-semibold">確認照片</h2>
          {/* Plain img: the preview source is a local object URL. */}
          <img
            src={previewUrl}
            alt="待上傳照片預覽"
            className="mt-4 max-h-96 w-full rounded border border-rail bg-paper object-contain"
          />
          <p className="mt-3 break-all text-sm text-night">
            {file.name} · {formatPhotoFileSize(file.size)}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={upload}
              disabled={uploading}
              className="min-h-11 w-full rounded bg-field px-5 text-base font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {uploading ? "上傳中…" : `確認上傳到 ${sceneCode}`}
            </button>
            <button
              type="button"
              onClick={cancelSelection}
              disabled={uploading}
              className="min-h-11 w-full rounded border border-rail px-5 text-base font-semibold disabled:opacity-50 sm:w-auto"
            >
              取消選取
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
