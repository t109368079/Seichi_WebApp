"use client";

import { useActionState } from "react";
import {
  handleCreateSceneAction,
  type SceneCreateActionState,
} from "@/app/scenes/actions";
import type { SceneCreateFormInput } from "@/application/scene-catalog";

const initialState: SceneCreateActionState = {};

export function SceneCreateForm() {
  const [state, formAction, isPending] = useActionState(
    handleCreateSceneAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          <RequiredLabel>場景代碼</RequiredLabel>
          <input
            name="sceneCode"
            required
            defaultValue={readValue(state, "sceneCode")}
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
            placeholder="例如：BHC-005"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          集數
          <input
            name="episode"
            defaultValue={readValue(state, "episode")}
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
            placeholder="例如：01"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          <RequiredLabel>作品名稱</RequiredLabel>
          <input
            name="workName"
            required
            defaultValue={readValue(state, "workName")}
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
            placeholder="例如：Blue Hour Crossing"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <RequiredLabel>作品短代碼</RequiredLabel>
          <input
            name="workShortCode"
            required
            defaultValue={readValue(state, "workShortCode")}
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
            placeholder="例如：BHC"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        <RequiredLabel>動畫 Drive 檔案 ID</RequiredLabel>
        <input
          name="animeImageDriveFileId"
          required
          defaultValue={readValue(state, "animeImageDriveFileId")}
          className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
          placeholder="Google Drive file id"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          <RequiredLabel>地點名稱</RequiredLabel>
          <input
            name="locationName"
            required
            defaultValue={readValue(state, "locationName")}
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
            placeholder="例如：Ikebukuro Station East Gate"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <RequiredLabel>區域</RequiredLabel>
          <input
            name="areaName"
            required
            defaultValue={readValue(state, "areaName")}
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
            placeholder="例如：Ikebukuro"
          />
        </label>
      </div>

      <fieldset className="grid gap-4 border-t border-rail pt-5">
        <legend className="text-sm font-semibold">
          導航參考
          <span className="ml-2 rounded border border-[#c3d8ee] bg-[#eef6ff] px-2 py-0.5 text-xs text-night">
            座標或 URL 必填
          </span>
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            緯度
            <input
              name="latitude"
              inputMode="decimal"
              defaultValue={readValue(state, "latitude")}
              className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
              placeholder="35.73028"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            經度
            <input
              name="longitude"
              inputMode="decimal"
              defaultValue={readValue(state, "longitude")}
              className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
              placeholder="139.71145"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          地圖 URL
          <input
            name="mapsUrl"
            defaultValue={readValue(state, "mapsUrl")}
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
            placeholder="https://maps.google.com/?q=35.73028,139.71145"
          />
        </label>
      </fieldset>

      <label className="grid gap-2 text-sm font-medium">
        備註
        <textarea
          name="notes"
          defaultValue={readValue(state, "notes")}
          className="min-h-24 rounded border border-rail bg-paper px-3 py-3 text-sm"
        />
      </label>

      {state.message ? (
        <p className="rounded border border-[#f1c6bb] bg-[#fff2ef] p-3 text-sm text-signal">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-fit rounded bg-field px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "新增中..." : "新增場景"}
      </button>
    </form>
  );
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      <span className="rounded border border-[#c8ded2] bg-[#edf8f1] px-2 py-0.5 text-xs text-field">
        必填
      </span>
    </span>
  );
}

function readValue(
  state: SceneCreateActionState,
  key: keyof SceneCreateFormInput,
): string {
  return state.values?.[key] ?? "";
}
