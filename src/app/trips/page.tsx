import Link from "next/link";
import { TripCreateForm } from "@/components/trip-create-form";
import { deleteTripAction } from "@/app/trips/actions";
import { getTripProgressPercent } from "@/application/trip-planning";
import { listTrips } from "@/infrastructure/repositories/trip-planning-repository";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const trips = await listTrips();

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-field">
              聖地巡禮
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              旅行規劃
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              把一天拆成一格格分鏡，手動排好順序，現地就照著節奏往前走。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/scenes"
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              場景目錄
            </Link>
            <Link
              href="/map"
              className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
            >
              地圖檢視
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="h-fit rounded border border-rail bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-semibold">建立旅行</h2>
          <div className="mt-4">
            <TripCreateForm />
          </div>
        </section>

        <section aria-label="旅行列表" className="grid min-w-0 gap-4">
          {trips.length === 0 ? (
            <div className="rounded border border-rail bg-white/95 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">尚未建立旅行</h2>
              <p className="mt-2 text-sm leading-6 text-night">
                建立第一趟旅行後，就可以把場景加入指定日期並手動排序。
              </p>
            </div>
          ) : (
            trips.map((trip) => (
              <article
                key={trip.id}
                className="rounded border border-rail bg-white/95 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link
                      href={`/trips/${trip.id}`}
                      className="text-xl font-semibold text-field underline-offset-4 hover:underline"
                    >
                      {trip.name}
                    </Link>
                    <p className="mt-2 text-sm text-night">
                      {trip.startDate} 至 {trip.endDate}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/trips/${trip.id}/field`}
                      aria-label={`${trip.name} 今日行程`}
                      className="flex min-h-10 w-fit items-center rounded border border-rail px-4 text-sm font-semibold"
                    >
                      今日行程
                    </Link>
                    <form action={deleteTripAction}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <button
                        type="submit"
                        className="min-h-10 rounded border border-rail px-4 text-sm font-semibold text-night"
                      >
                        刪除旅行
                      </button>
                    </form>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                  <TripCardStat label="天數" value={trip.dayCount} />
                  <TripCardStat label="場景" value={trip.sceneCount} />
                  <TripCardStat label="已審核" value={trip.summary.reviewed} />
                  <TripCardStat
                    label="完成率"
                    value={`${getTripProgressPercent(trip.summary)}%`}
                  />
                </dl>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function TripCardStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-t border-rail pt-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-1 text-night">{value}</dd>
    </div>
  );
}
