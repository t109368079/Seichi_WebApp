"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getTripProgressPercent,
  type TripDayPlanningItem,
  type TripDaySceneItem,
  type TripDetailItem,
} from "@/application/trip-planning";
import { getSceneStatusLabel } from "@/application/scene-catalog";
import {
  moveTripSceneAction,
  removeTripSceneAction,
  reorderTripDayScenesAction,
} from "@/app/trips/actions";

export function TripDetailView({ trip }: { trip: TripDetailItem }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6">
      <section className="rounded border border-rail bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">行程進度</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-7">
          <TripStat label="總場景" value={trip.summary.totalScenes} />
          <TripStat label="未拍攝" value={trip.summary.notShot} />
          <TripStat label="待確認" value={trip.summary.pendingReview} />
          <TripStat label="已審核" value={trip.summary.reviewed} />
          <TripStat label="需要補拍" value={trip.summary.retakeRequired} />
          <TripStat label="已略過" value={trip.summary.skipped} />
          <TripStat
            label="完成率"
            value={`${getTripProgressPercent(trip.summary)}%`}
          />
        </dl>
      </section>

      <section aria-label="每日行程" className="grid gap-5">
        {trip.days.map((day) => (
          <TripDayPlanner key={day.id} day={day} />
        ))}
      </section>
    </div>
  );
}

function TripStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-rail bg-paper p-4">
      <dt className="text-xs font-semibold text-night">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function TripDayPlanner({ day }: { day: TripDayPlanningItem }) {
  const [items, setItems] = useState(day.scenes);
  const [draggingId, setDraggingId] = useState("");
  const hasScenes = items.length > 0;

  useEffect(() => {
    setItems(day.scenes);
  }, [day.scenes]);

  const sceneCountText = useMemo(
    () => `${day.summary.totalScenes} 個場景`,
    [day.summary.totalScenes],
  );

  return (
    <article
      id={`day-${day.id}`}
      className="scroll-mt-4 rounded border border-rail bg-white/95 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-rail pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{day.date}</h2>
          <p className="mt-2 text-sm text-night">
            {sceneCountText} · 已審核 {day.summary.reviewed} · 需要補拍{" "}
            {day.summary.retakeRequired}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/scenes?tripDayId=${day.id}`}
            className="flex min-h-10 w-fit items-center rounded bg-field px-4 text-sm font-semibold text-white"
          >
            從目錄加入
          </Link>
          <Link
            href={`/map?tripDayId=${day.id}`}
            className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
          >
            從地圖加入
          </Link>
          <Link
            href={`/field/${day.id}`}
            aria-label={`進入 ${day.date} 現地模式`}
            className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
          >
            進入現地模式
          </Link>
        </div>
      </div>

      {hasScenes ? (
        <div className="mt-4 grid gap-3">
          <ol className="grid gap-3" aria-label={`${day.date} 場景順序`}>
            {items.map((item, index) => (
              <TripSceneRow
                key={item.id}
                item={item}
                index={index}
                totalCount={items.length}
                tripDayId={day.id}
                draggingId={draggingId}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId("")}
                onDrop={(targetId) => {
                  setItems((currentItems) =>
                    moveItemBeforeTarget(currentItems, draggingId, targetId),
                  );
                  setDraggingId("");
                }}
              />
            ))}
          </ol>
          <form action={reorderTripDayScenesAction}>
            <input type="hidden" name="tripDayId" value={day.id} />
            {items.map((item) => (
              <input
                key={item.id}
                type="hidden"
                name="tripSceneId"
                value={item.id}
              />
            ))}
            <button
              type="submit"
              className="min-h-10 w-fit rounded border border-rail px-4 text-sm font-semibold"
            >
              儲存排序
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4 rounded border border-rail bg-paper p-4 text-sm text-night">
          這一天還沒有場景。請從目錄或地圖加入。
        </div>
      )}
    </article>
  );
}

function TripSceneRow({
  item,
  index,
  totalCount,
  tripDayId,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  item: TripDaySceneItem;
  index: number;
  totalCount: number;
  tripDayId: string;
  draggingId: string;
  onDragStart: (tripSceneId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetTripSceneId: string) => void;
}) {
  return (
    <li
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={() => onDrop(item.id)}
      className={`rounded border border-rail bg-paper p-4 ${
        draggingId === item.id ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-night">#{index + 1}</p>
          <Link
            href={`/scenes/${item.scene.id}`}
            className="mt-1 block text-lg font-semibold text-field underline-offset-4 hover:underline"
          >
            {item.scene.sceneCode}
          </Link>
          <p className="mt-1 text-sm leading-6 text-night">
            {item.scene.work.shortCode} - {item.scene.work.name}
            {item.scene.episode ? ` · 第 ${item.scene.episode} 集` : ""}
          </p>
          <p className="text-sm leading-6 text-night">
            <Link
              href={`/locations/${item.scene.location.id}?tripDayId=${tripDayId}`}
              className="underline-offset-4 hover:underline"
            >
              {item.scene.location.name}
            </Link>
            {item.scene.location.areaName
              ? `, ${item.scene.location.areaName}`
              : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <span className="flex min-h-10 w-fit items-center rounded border border-rail bg-white px-3 text-xs font-semibold text-night">
            {getSceneStatusLabel(item.scene.status)}
          </span>
          <div className="flex gap-2">
            <MoveButton
              tripSceneId={item.id}
              direction="up"
              label={`上移 ${item.scene.sceneCode}`}
              disabled={index === 0}
            />
            <MoveButton
              tripSceneId={item.id}
              direction="down"
              label={`下移 ${item.scene.sceneCode}`}
              disabled={index === totalCount - 1}
            />
          </div>
          <form action={removeTripSceneAction}>
            <input type="hidden" name="tripSceneId" value={item.id} />
            <button
              type="submit"
              aria-label={`移除 ${item.scene.sceneCode}`}
              className="min-h-10 w-fit rounded border border-rail px-4 text-sm font-semibold text-night"
            >
              移除
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

function MoveButton({
  tripSceneId,
  direction,
  label,
  disabled,
}: {
  tripSceneId: string;
  direction: "up" | "down";
  label: string;
  disabled: boolean;
}) {
  return (
    <form action={moveTripSceneAction}>
      <input type="hidden" name="tripSceneId" value={tripSceneId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        aria-label={label}
        disabled={disabled}
        className="min-h-10 min-w-10 rounded border border-rail bg-white px-3 text-sm font-semibold disabled:opacity-40"
      >
        {direction === "up" ? "上移" : "下移"}
      </button>
    </form>
  );
}

function moveItemBeforeTarget(
  items: readonly TripDaySceneItem[],
  draggingId: string,
  targetId: string,
): TripDaySceneItem[] {
  if (!draggingId || draggingId === targetId) {
    return [...items];
  }

  const draggingIndex = items.findIndex((item) => item.id === draggingId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (draggingIndex === -1 || targetIndex === -1) {
    return [...items];
  }

  const reordered = [...items];
  const [draggedItem] = reordered.splice(draggingIndex, 1);

  if (!draggedItem) {
    return [...items];
  }

  reordered.splice(targetIndex, 0, draggedItem);

  return reordered;
}
