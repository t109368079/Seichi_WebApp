import Link from "next/link";
import { getFieldSceneHref, type FieldDayView } from "@/application/field-mode";
import { getSceneStatusLabel } from "@/application/scene-catalog";

export function FieldDayItinerary({ day }: { day: FieldDayView }) {
  const hasScenes = day.scenes.length > 0;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-6">
      <section
        aria-label="今日進度"
        className="rounded border border-rail bg-white/95 p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold">今日進度</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <FieldStat label="總場景" value={day.completion.total} />
          <FieldStat label="已處理" value={day.completion.handled} />
          <FieldStat label="待處理" value={day.completion.remaining} />
          <FieldStat label="需要補拍" value={day.summary.retakeRequired} />
          <FieldStat label="處理率" value={`${day.completion.percent}%`} />
        </dl>
      </section>

      {hasScenes ? (
        <ol aria-label={`${day.date} 現地順序`} className="grid gap-4">
          {day.scenes.map((item, index) => (
            <li
              key={item.id}
              className="rounded border border-rail bg-white/95 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-night">
                    #{index + 1}
                  </p>
                  <Link
                    href={getFieldSceneHref(day.tripDayId, item.id)}
                    className="mt-1 block text-2xl font-semibold text-field underline-offset-4 hover:underline"
                  >
                    {item.scene.sceneCode}
                  </Link>
                  <p className="mt-1 text-base leading-7 text-night">
                    {item.scene.work.shortCode} - {item.scene.work.name}
                    {item.scene.episode ? ` · 第 ${item.scene.episode} 集` : ""}
                  </p>
                  <p className="text-base leading-7 text-night">
                    {item.scene.location.name}
                    {item.scene.location.areaName
                      ? `, ${item.scene.location.areaName}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                  <span className="flex min-h-11 w-fit items-center rounded border border-rail bg-paper px-4 text-sm font-semibold text-night">
                    {getSceneStatusLabel(item.scene.status)}
                  </span>
                  <Link
                    href={getFieldSceneHref(day.tripDayId, item.id)}
                    className="flex min-h-11 w-fit items-center rounded bg-field px-5 text-base font-semibold text-white"
                  >
                    開始拍攝
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded border border-rail bg-white/95 p-6 shadow-sm text-base leading-7 text-night">
          這一天還沒有場景。請先回到旅行規劃，從場景目錄或地圖加入場景。
        </div>
      )}
    </div>
  );
}

function FieldStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded border border-rail bg-paper p-4">
      <dt className="text-xs font-semibold text-night">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}
