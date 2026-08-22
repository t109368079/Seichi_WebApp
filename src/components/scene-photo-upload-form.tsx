"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatPhotoFileSize,
  getGooglePhotosImportEndpoint,
  getGooglePhotosPickerSessionEndpoint,
  getGooglePhotosPickerSessionsEndpoint,
  getMaxPhotoFileSizeLabel,
  getPhotoAcceptAttribute,
  getPhotoUploadEndpoint,
} from "@/application/scene-photo";
import {
  isAllowedPhotoMimeType,
  maxPhotoFileSizeBytes,
} from "@/domain/scene-photo";

type PhotoSource = "local" | "google";

interface GooglePickerMediaItem {
  id: string;
  fileName: string;
  mimeType: string;
  type?: string;
  createTime?: string;
}

interface GooglePickerSessionResponse {
  sessionId: string;
  pickerUri: string;
  mediaItemsSet: boolean;
  pollIntervalMs: number;
  timeoutMs: number;
  expireTime?: string;
  mediaItems?: GooglePickerMediaItem[];
}

export function ScenePhotoUploadForm({
  sceneId,
  sceneCode,
  tripId,
  tripDayId,
  tripSceneId,
  googlePhotosImportEnabled,
  googleConnected,
  googlePhotosScopeGranted,
  googleIntegrationHref,
  preferredPhotoSource = "local-upload",
  localUploadRole = "primary",
}: {
  sceneId: string;
  sceneCode: string;
  tripId: string;
  tripDayId: string;
  tripSceneId: string;
  googlePhotosImportEnabled: boolean;
  googleConnected: boolean;
  googlePhotosScopeGranted: boolean;
  googleIntegrationHref: string;
  preferredPhotoSource?: "google-photos" | "local-upload";
  localUploadRole?: "small-file-backup" | "primary";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const pollTimeoutRef = useRef<number | undefined>(undefined);
  const [source, setSource] = useState<PhotoSource>(
    preferredPhotoSource === "google-photos" ? "google" : "local",
  );
  const [file, setFile] = useState<File | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [googleSession, setGoogleSession] = useState<
    GooglePickerSessionResponse | undefined
  >();
  const [googleItems, setGoogleItems] = useState<GooglePickerMediaItem[]>([]);
  const [googlePolling, setGooglePolling] = useState(false);
  const [googleImporting, setGoogleImporting] = useState(false);

  const googleDisabledReason = getGooglePhotosDisabledReason({
    googlePhotosImportEnabled,
    googleConnected,
    googlePhotosScopeGranted,
  });
  const selectedGoogleItem = googleItems[0];

  useEffect(() => {
    if (!file) {
      setPreviewUrl(undefined);

      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => clearGooglePolling();
  }, []);

  function selectSource(nextSource: PhotoSource) {
    setSource(nextSource);
    setMessage(undefined);
  }

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

  async function startGooglePicker() {
    if (googleDisabledReason || googlePolling || googleImporting) {
      if (googleDisabledReason) {
        setMessage(googleDisabledReason);
      }

      return;
    }

    setMessage(undefined);
    setGoogleItems([]);
    setGoogleSession(undefined);
    clearGooglePolling();

    try {
      const response = await fetch(getGooglePhotosPickerSessionsEndpoint(), {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setMessage(body.message ?? "無法建立 Google 相簿選取工作階段。");

        return;
      }

      const session = (await response.json()) as GooglePickerSessionResponse;
      setGoogleSession(session);

      const pickerWindow = window.open(
        session.pickerUri,
        "_blank",
        "noopener,noreferrer",
      );

      setMessage(
        pickerWindow
          ? "已開啟 Google 相簿選取視窗。"
          : "Google 相簿視窗沒有自動開啟，請點下方連結。",
      );
      startGooglePolling(
        session.sessionId,
        session.pollIntervalMs,
        Date.now(),
        session.timeoutMs,
      );
    } catch {
      setMessage("無法建立 Google 相簿選取工作階段，請確認網路後重試。");
    }
  }

  async function importGooglePhoto() {
    if (!googleSession || !selectedGoogleItem || googleImporting) {
      return;
    }

    setGoogleImporting(true);
    setMessage(undefined);

    try {
      const response = await fetch(getGooglePhotosImportEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sceneId,
          tripId,
          tripDayId,
          pickerSessionId: googleSession.sessionId,
          mediaItemId: selectedGoogleItem.id,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setMessage(body.message ?? "Google 相簿照片匯入失敗。");
        setGoogleImporting(false);

        return;
      }

      router.push(`/field/${tripDayId}/${tripSceneId}`);
      router.refresh();
    } catch {
      setMessage("Google 相簿照片匯入失敗，請確認網路後重試。");
      setGoogleImporting(false);
    }
  }

  async function cancelGoogleSession() {
    const sessionId = googleSession?.sessionId;

    clearGooglePolling();
    setGooglePolling(false);
    setGoogleSession(undefined);
    setGoogleItems([]);
    setMessage(undefined);

    if (sessionId) {
      await fetch(getGooglePhotosPickerSessionEndpoint(sessionId), {
        method: "DELETE",
      }).catch(() => undefined);
    }
  }

  async function checkGoogleSelection() {
    if (!googleSession || googleImporting) {
      return;
    }

    setMessage(undefined);

    const session = await loadGooglePickerSession(googleSession.sessionId);

    if (session && !session.mediaItemsSet) {
      setMessage("尚未取得 Google 相簿選取照片。");
    }
  }

  function startGooglePolling(
    sessionId: string,
    delayMs: number,
    startedAt: number,
    timeoutMs: number,
  ) {
    clearGooglePolling();
    setGooglePolling(true);

    pollTimeoutRef.current = window.setTimeout(
      async () => {
        const session = await loadGooglePickerSession(sessionId);

        if (!session || session.mediaItemsSet) {
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          setGooglePolling(false);
          setMessage("Google 相簿選取逾時，請重新開啟選取。");

          return;
        }

        startGooglePolling(
          sessionId,
          session.pollIntervalMs,
          startedAt,
          timeoutMs,
        );
      },
      Math.max(1000, delayMs),
    );
  }

  async function loadGooglePickerSession(
    sessionId: string,
  ): Promise<GooglePickerSessionResponse | undefined> {
    try {
      const response = await fetch(
        getGooglePhotosPickerSessionEndpoint(sessionId),
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setMessage(body.message ?? "無法讀取 Google 相簿選取狀態。");
        setGooglePolling(false);

        return undefined;
      }

      const session = (await response.json()) as GooglePickerSessionResponse;

      setGoogleSession((current) =>
        current?.sessionId === sessionId ? session : current,
      );

      if (session.mediaItemsSet) {
        const mediaItems = session.mediaItems ?? [];
        setGoogleItems(mediaItems);
        setGooglePolling(false);
        setMessage(
          mediaItems.length > 0
            ? "已取得 Google 相簿選取照片。"
            : "Google 相簿沒有回傳照片，請重新選取。",
        );
      }

      return session;
    } catch {
      setGooglePolling(false);
      setMessage("無法讀取 Google 相簿選取狀態，請確認網路後重試。");

      return undefined;
    }
  }

  function clearGooglePolling() {
    if (pollTimeoutRef.current !== undefined) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = undefined;
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded border border-field bg-white/95 p-5 shadow-sm">
        <p className="text-sm font-semibold text-field">上傳目標場景</p>
        <p className="mt-2 text-2xl font-semibold">{sceneCode}</p>
        <p className="mt-2 text-sm leading-6 text-night">
          照片會永久綁定這個場景，且不會覆蓋任何既有 Take。
        </p>
      </div>

      {message ? (
        <p
          role="alert"
          className="rounded border border-rail bg-white/95 p-4 shadow-sm text-sm font-semibold text-night"
        >
          {message}
        </p>
      ) : null}

      <div className="rounded border border-rail bg-white/95 p-5 shadow-sm">
        <div
          role="tablist"
          aria-label="照片來源"
          className="grid grid-cols-2 gap-2"
        >
          <SourceTab
            active={source === "local"}
            label="本地照片"
            onClick={() => selectSource("local")}
          />
          <SourceTab
            active={source === "google"}
            label="Google 相簿"
            onClick={() => selectSource("google")}
          />
        </div>
      </div>

      {source === "local" ? (
        <div className="rounded border border-rail bg-white/95 p-5 shadow-sm">
          <label
            htmlFor="scene-photo-input"
            className="text-base font-semibold"
          >
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
          {localUploadRole === "small-file-backup" && !file ? (
            <p className="mt-3 rounded border border-rail bg-paper p-3 text-sm leading-6 text-night">
              Vercel 現地使用時請優先使用 Google
              相簿；本地照片上傳僅適合小檔備援。
            </p>
          ) : null}
          {file && previewUrl ? (
            <div className="mt-5 border-t border-rail pt-5">
              <h2 className="text-lg font-semibold">確認照片</h2>
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
              {/* Plain img: the preview source is a local object URL. */}
              <img
                src={previewUrl}
                alt="待上傳照片預覽"
                className="mt-5 max-h-96 w-full rounded border border-rail bg-paper object-contain"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded border border-rail bg-white/95 p-5 shadow-sm">
          <h2 className="text-base font-semibold">從 Google 相簿選取照片</h2>
          <p className="mt-3 text-sm leading-6 text-night">
            匯入時會直接存到 Google Drive 照片資料夾，不會在本機建立永久副本。
          </p>

          {googleDisabledReason ? (
            <div className="mt-4 rounded border border-[#f1c6bb] bg-[#fff2ef] p-4 text-sm leading-6 text-signal">
              <p>{googleDisabledReason}</p>
              <a
                href={googleIntegrationHref}
                className="mt-3 inline-flex min-h-11 items-center rounded border border-[#f1c6bb] bg-white px-4 font-semibold"
              >
                開啟 Google 整合設定
              </a>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={startGooglePicker}
                disabled={googlePolling || googleImporting}
                className="min-h-11 w-full rounded bg-field px-5 text-base font-semibold text-white disabled:opacity-50 sm:w-auto"
              >
                {googlePolling ? "等待選取…" : "開啟 Google 相簿"}
              </button>
              {googleSession ? (
                <button
                  type="button"
                  onClick={cancelGoogleSession}
                  disabled={googleImporting}
                  className="min-h-11 w-full rounded border border-rail px-5 text-base font-semibold disabled:opacity-50 sm:w-auto"
                >
                  取消 Google 選取
                </button>
              ) : null}
            </div>
          )}

          {googleSession ? (
            <a
              href={googleSession.pickerUri}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              重新開啟 Google 相簿視窗
            </a>
          ) : null}

          {googleSession && !selectedGoogleItem ? (
            <button
              type="button"
              onClick={checkGoogleSelection}
              disabled={googleImporting}
              className="mt-3 min-h-11 w-full rounded border border-rail bg-paper px-4 text-sm font-semibold disabled:opacity-50 sm:w-auto"
            >
              檢查選取結果
            </button>
          ) : null}
        </div>
      )}

      {source === "google" && selectedGoogleItem ? (
        <div className="rounded border border-rail bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-semibold">確認 Google 相簿照片</h2>
          <p className="mt-3 break-all text-sm text-night">
            {selectedGoogleItem.fileName} · {selectedGoogleItem.mimeType}
            {selectedGoogleItem.createTime
              ? ` · 拍攝於 ${formatTimestamp(selectedGoogleItem.createTime)}`
              : ""}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={importGooglePhoto}
              disabled={googleImporting}
              className="min-h-11 w-full rounded bg-field px-5 text-base font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {googleImporting ? "匯入中…" : `匯入到 ${sceneCode}`}
            </button>
            <button
              type="button"
              onClick={cancelGoogleSession}
              disabled={googleImporting}
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

function SourceTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 rounded border px-4 text-sm font-semibold ${
        active
          ? "border-field bg-field text-white"
          : "border-rail bg-paper text-night"
      }`}
    >
      {label}
    </button>
  );
}

function getGooglePhotosDisabledReason({
  googlePhotosImportEnabled,
  googleConnected,
  googlePhotosScopeGranted,
}: {
  googlePhotosImportEnabled: boolean;
  googleConnected: boolean;
  googlePhotosScopeGranted: boolean;
}): string | undefined {
  if (!googlePhotosImportEnabled) {
    return "Google 相簿匯入需先啟用 Google Drive 照片儲存，避免在本機留下永久副本。";
  }

  if (!googleConnected) {
    return "請先連接 Google，才能從 Google 相簿選取照片。";
  }

  if (!googlePhotosScopeGranted) {
    return "目前 Google 連線缺少 Photos Picker 權限，請重新連接 Google。";
  }

  return undefined;
}

function formatTimestamp(value: string): string {
  return value.slice(0, 16).replace("T", " ");
}
