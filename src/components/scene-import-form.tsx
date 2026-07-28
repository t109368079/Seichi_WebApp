"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requiredSceneImportCsvColumns,
  sceneImportCsvColumns,
  type SceneImportPreview,
} from "@/application/scene-import";
import {
  handleSceneImportAction,
  type SceneImportActionState,
} from "@/app/imports/scenes/actions";

const initialState: SceneImportActionState = {
  stage: "idle",
};

export function SceneImportForm() {
  const [state, formAction, isPending] = useActionState(
    handleSceneImportAction,
    initialState,
  );
  const preview = state.preview;

  return (
    <div className="grid gap-5">
      <section className="rounded border border-rail bg-white p-5">
        <h2 className="text-lg font-semibold">CSV v1</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-rail text-xs uppercase tracking-wide text-night">
                <th className="py-2 pr-4 font-semibold">Column</th>
                <th className="py-2 pr-4 font-semibold">Required</th>
              </tr>
            </thead>
            <tbody>
              {sceneImportCsvColumns.map((column) => (
                <tr key={column} className="border-b border-rail last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{column}</td>
                  <td className="py-2 pr-4">
                    {requiredSceneImportCsvColumns.includes(
                      column as (typeof requiredSceneImportCsvColumns)[number],
                    )
                      ? "Yes"
                      : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-rail bg-white p-5">
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="intent" value="preview" />
          <label className="grid gap-2 text-sm font-medium">
            Scene CSV
            <input
              name="csvFile"
              type="file"
              accept=".csv,text/csv"
              className="min-h-11 rounded border border-rail bg-paper px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 w-fit rounded bg-field px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Working..." : "Preview CSV"}
          </button>
        </form>
      </section>

      <StatusMessage state={state} />

      {preview ? (
        <SceneImportPreviewPanel
          preview={preview}
          csvText={state.csvText}
          formAction={formAction}
          isPending={isPending}
          committed={state.stage === "committed"}
        />
      ) : null}
    </div>
  );
}

function StatusMessage({ state }: { state: SceneImportActionState }) {
  if (!state.message) {
    return null;
  }

  const tone =
    state.stage === "error"
      ? "border-[#f1c6bb] bg-[#fff2ef] text-signal"
      : state.stage === "committed"
        ? "border-[#c8ded2] bg-[#edf8f1] text-field"
        : "border-[#c3d8ee] bg-[#eef6ff] text-night";

  return (
    <div aria-live="polite" className={`rounded border p-4 text-sm ${tone}`}>
      {state.message}
    </div>
  );
}

function SceneImportPreviewPanel({
  preview,
  csvText,
  formAction,
  isPending,
  committed,
}: {
  preview: SceneImportPreview;
  csvText?: string;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  committed: boolean;
}) {
  return (
    <section aria-label="Import preview" className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <ImportStat label="Rows" value={preview.summary.totalRows} />
        <ImportStat label="Creates" value={preview.summary.createCount} />
        <ImportStat label="Updates" value={preview.summary.updateCount} />
        <ImportStat label="Errors" value={preview.summary.errorCount} />
      </div>

      {preview.errors.length > 0 ? (
        <SceneImportErrors errors={preview.errors} />
      ) : null}

      {preview.rows.length > 0 ? <SceneImportRows rows={preview.rows} /> : null}

      {committed ? (
        <div className="rounded border border-rail bg-white p-5">
          <h2 className="text-lg font-semibold">Import complete</h2>
          <Link
            href="/scenes"
            className="mt-4 flex min-h-11 w-fit items-center rounded bg-field px-5 text-sm font-semibold text-white"
          >
            View scene catalog
          </Link>
        </div>
      ) : preview.canCommit ? (
        <form
          action={formAction}
          className="rounded border border-rail bg-white p-5"
        >
          <input type="hidden" name="intent" value="commit" />
          <textarea
            name="csvText"
            value={csvText ?? ""}
            readOnly
            className="hidden"
          />
          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 rounded bg-field px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Working..." : "Confirm import"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function ImportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-rail bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-night">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SceneImportErrors({
  errors,
}: {
  errors: SceneImportPreview["errors"];
}) {
  return (
    <section
      aria-label="Import errors"
      className="rounded border border-[#f1c6bb] bg-white p-5"
    >
      <h2 className="text-lg font-semibold text-signal">Errors</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-rail text-xs uppercase tracking-wide text-night">
              <th className="py-2 pr-4 font-semibold">Row</th>
              <th className="py-2 pr-4 font-semibold">Field</th>
              <th className="py-2 pr-4 font-semibold">Message</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((error, index) => (
              <tr
                key={`${error.rowNumber}-${error.field}-${index}`}
                className="border-b border-rail last:border-0"
              >
                <td className="py-2 pr-4">{error.rowNumber}</td>
                <td className="py-2 pr-4 font-mono text-xs">{error.field}</td>
                <td className="py-2 pr-4">{error.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SceneImportRows({ rows }: { rows: SceneImportPreview["rows"] }) {
  return (
    <section
      aria-label="Import rows"
      className="rounded border border-rail bg-white p-5"
    >
      <h2 className="text-lg font-semibold">Rows</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-rail text-xs uppercase tracking-wide text-night">
              <th className="py-2 pr-4 font-semibold">Action</th>
              <th className="py-2 pr-4 font-semibold">Scene</th>
              <th className="py-2 pr-4 font-semibold">Work</th>
              <th className="py-2 pr-4 font-semibold">Location</th>
              <th className="py-2 pr-4 font-semibold">Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.rowNumber}-${row.sceneCode}`}
                className="border-b border-rail last:border-0"
              >
                <td className="py-2 pr-4 capitalize">{row.action}</td>
                <td className="py-2 pr-4 font-mono text-xs">{row.sceneCode}</td>
                <td className="py-2 pr-4">
                  {row.workShortCode} - {row.workName}
                </td>
                <td className="py-2 pr-4">
                  {row.locationName}, {row.areaName}
                </td>
                <td className="py-2 pr-4">
                  {row.latitude.toFixed(5)}, {row.longitude.toFixed(5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
