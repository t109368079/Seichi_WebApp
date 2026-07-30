"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  getSceneStatusLabel,
  getSceneStatusOptions,
  type SceneCatalogFilters,
  type SceneCatalogItem,
} from "@/application/scene-catalog";
import {
  getCoordinateIssue,
  getNavigationTarget,
  type SceneMapMarkerGroup,
} from "@/application/scene-map";

interface SceneMapProps {
  markerGroups: readonly SceneMapMarkerGroup[];
  mapSceneCount: number;
  totalSceneCount: number;
  omittedSceneCount: number;
  works: readonly {
    id: string;
    name: string;
    shortCode: string;
  }[];
  locations: readonly {
    id: string;
    name: string;
    areaName?: string;
  }[];
  filters: SceneCatalogFilters;
}

const statusTone = {
  NOT_SHOT: "border-rail bg-paper text-ink",
  PENDING_REVIEW: "border-[#c3d8ee] bg-[#eef6ff] text-night",
  REVIEWED: "border-[#c8ded2] bg-[#edf8f1] text-field",
  RETAKE_REQUIRED: "border-[#f1c6bb] bg-[#fff2ef] text-signal",
  SKIPPED: "border-[#d2d6dd] bg-[#f3f4f6] text-night",
} satisfies Record<SceneCatalogItem["status"], string>;

export function SceneMap({
  markerGroups,
  mapSceneCount,
  totalSceneCount,
  omittedSceneCount,
  works,
  locations,
  filters,
}: SceneMapProps) {
  const [selectedGroupId, setSelectedGroupId] = useState(
    markerGroups[0]?.id ?? "",
  );
  const selectedGroup = useMemo(
    () =>
      markerGroups.find((group) => group.id === selectedGroupId) ??
      markerGroups[0],
    [markerGroups, selectedGroupId],
  );

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-wide text-field"
            >
              Seichi Pilgrimage
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              Scene Map
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              Browse scenes by coordinate groups and open navigation points.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <MapStat label="Scenes" value={mapSceneCount.toString()} />
              <MapStat label="Markers" value={markerGroups.length.toString()} />
              <MapStat label="Total" value={totalSceneCount.toString()} />
            </div>
            <Link
              href={buildCatalogHref(filters)}
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              Scene catalog
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <MapFilterForm filters={filters} works={works} locations={locations} />

        <section className="grid min-w-0 gap-5" aria-label="Map results">
          {omittedSceneCount > 0 ? (
            <div className="rounded border border-[#f1c6bb] bg-white p-4 text-sm text-signal">
              {omittedSceneCount} scene
              {omittedSceneCount === 1 ? "" : "s"} cannot be placed because
              coordinates are missing or invalid.
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,22rem)]">
            <ProjectedMap
              markerGroups={markerGroups}
              selectedGroupId={selectedGroup?.id ?? ""}
              onSelectGroup={setSelectedGroupId}
            />
            <SelectedMarkerPanel group={selectedGroup} />
          </div>
        </section>
      </div>
    </main>
  );
}

function MapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-rail bg-paper px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-night">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function MapFilterForm({
  filters,
  works,
  locations,
}: Pick<SceneMapProps, "filters" | "works" | "locations">) {
  return (
    <aside
      aria-label="Map filters"
      className="min-w-0 bg-paper lg:sticky lg:top-4 lg:h-fit"
    >
      <form
        action="/map"
        className="grid min-w-0 gap-4 rounded border border-rail bg-white p-4"
      >
        <h2 className="text-base font-semibold">Filters</h2>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          Work
          <select
            name="workId"
            aria-label="Filter map by work"
            defaultValue={filters.workId ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">All works</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.shortCode} - {work.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          Location
          <select
            name="locationId"
            aria-label="Filter map by location"
            defaultValue={filters.locationId ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.areaName ? `${location.areaName} - ` : ""}
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium">
          Status
          <select
            name="status"
            aria-label="Filter map by status"
            defaultValue={filters.status ?? ""}
            className="min-h-10 w-full min-w-0 rounded border border-rail bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            {getSceneStatusOptions().map((status) => (
              <option key={status} value={status}>
                {getSceneStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid min-w-0 grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-1">
          <button
            type="submit"
            className="min-h-10 w-full min-w-0 rounded bg-field px-4 text-sm font-semibold text-white"
          >
            Apply filters
          </button>
          <Link
            href="/map"
            className="flex min-h-10 w-full min-w-0 items-center justify-center rounded border border-rail px-4 text-sm font-semibold"
          >
            Clear
          </Link>
        </div>
      </form>
    </aside>
  );
}

function ProjectedMap({
  markerGroups,
  selectedGroupId,
  onSelectGroup,
}: {
  markerGroups: readonly SceneMapMarkerGroup[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
}) {
  return (
    <section
      aria-label="Projected scene map"
      className="relative min-h-[30rem] overflow-hidden rounded border border-rail bg-[#eef3ee]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,58,50,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(43,58,50,0.12)_1px,transparent_1px)] bg-[size:12.5%_12.5%]" />
      <div className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 bg-[#d7e5dd]" />
      <div className="absolute left-1/2 top-0 h-full w-8 -translate-x-1/2 bg-[#d7e5dd]" />

      {markerGroups.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-night">
          No scenes with valid coordinates match the current filters.
        </div>
      ) : null}

      {markerGroups.map((group) => {
        const selected = group.id === selectedGroupId;

        return (
          <button
            key={group.id}
            type="button"
            aria-label={`Select marker group: ${group.sceneCount} scenes at ${group.label}`}
            aria-pressed={selected}
            onClick={() => onSelectGroup(group.id)}
            className={`absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition ${
              selected
                ? "border-field bg-field text-white"
                : "border-ink bg-white text-ink hover:border-field"
            }`}
            style={{
              left: `${group.xPercent}%`,
              top: `${group.yPercent}%`,
            }}
          >
            {group.sceneCount}
          </button>
        );
      })}
    </section>
  );
}

function SelectedMarkerPanel({ group }: { group?: SceneMapMarkerGroup }) {
  if (!group) {
    return (
      <aside
        aria-label="Selected marker"
        className="rounded border border-rail bg-white p-5"
      >
        <h2 className="text-lg font-semibold">Selected marker</h2>
        <p className="mt-3 text-sm leading-6 text-night">
          Choose a marker group to inspect scene identities.
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Selected marker"
      className="grid h-fit gap-4 rounded border border-rail bg-white p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">{group.label}</h2>
        <p className="mt-2 text-sm text-night">
          {group.sceneCount} scene{group.sceneCount === 1 ? "" : "s"} at{" "}
          {group.latitude.toFixed(5)}, {group.longitude.toFixed(5)}
        </p>
      </div>

      <div className="grid gap-4">
        {group.scenes.map((scene) => (
          <SceneMapCard key={scene.id} scene={scene} />
        ))}
      </div>
    </aside>
  );
}

function SceneMapCard({ scene }: { scene: SceneCatalogItem }) {
  const navigation = getNavigationTarget(scene);
  const coordinateIssue = getCoordinateIssue(scene);

  return (
    <article className="rounded border border-rail bg-paper p-4">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
        <div className="flex aspect-square min-w-0 flex-col justify-center rounded border border-rail bg-white p-2 text-xs">
          <span className="font-semibold">Anime ref</span>
          <span className="mt-1 break-all text-night">
            {scene.animeImageDriveFileId}
          </span>
        </div>
        <div className="min-w-0">
          <Link
            href={`/scenes/${scene.id}`}
            className="font-semibold text-field underline-offset-4 hover:underline"
          >
            {scene.sceneCode}
          </Link>
          <p className="mt-1 text-sm leading-5 text-night">
            {scene.work.shortCode} - {scene.work.name}
            {scene.episode ? ` · Episode ${scene.episode}` : ""}
          </p>
          <span
            className={`mt-2 inline-flex w-fit rounded border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone[scene.status]}`}
          >
            {getSceneStatusLabel(scene.status)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {navigation.href ? (
          <a
            href={navigation.href}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-10 w-fit items-center rounded bg-field px-4 text-sm font-semibold text-white"
          >
            Open navigation
          </a>
        ) : (
          <span className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold text-night">
            {coordinateIssue ?? "Navigation unavailable"}
          </span>
        )}
      </div>
    </article>
  );
}

function buildCatalogHref(filters: SceneCatalogFilters): string {
  const params = new URLSearchParams();

  if (filters.workId) {
    params.set("workId", filters.workId);
  }

  if (filters.locationId) {
    params.set("locationId", filters.locationId);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return query ? `/scenes?${query}` : "/scenes";
}
