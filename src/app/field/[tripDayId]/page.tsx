import Link from "next/link";
import { notFound } from "next/navigation";
import { FieldDayItinerary } from "@/components/field-day-view";
import { getFieldModeDay } from "@/infrastructure/repositories/field-mode-repository";

export const dynamic = "force-dynamic";

interface FieldDayPageProps {
  params: Promise<{
    tripDayId: string;
  }>;
}

export default async function FieldDayPage({ params }: FieldDayPageProps) {
  const { tripDayId } = await params;
  const day = await getFieldModeDay(tripDayId);

  if (!day) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href={`/trips/${day.tripId}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-wide text-field"
            >
              返回旅行規劃
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              現地模式
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-night">
              {day.tripName} · {day.date}
              {day.title ? ` · ${day.title}` : ""}
            </p>
          </div>
          <Link
            href={`/scenes?tripDayId=${day.tripDayId}`}
            className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-base font-semibold"
          >
            加入更多場景
          </Link>
        </div>
      </header>

      <FieldDayItinerary day={day} />
    </main>
  );
}
