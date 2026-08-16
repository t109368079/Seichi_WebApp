import Link from "next/link";
import { notFound } from "next/navigation";
import { TripDetailView } from "@/components/trip-detail-view";
import { getTripDetail } from "@/infrastructure/repositories/trip-planning-repository";

export const dynamic = "force-dynamic";

interface TripDetailPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { tripId } = await params;
  const trip = await getTripDetail(tripId);

  if (!trip) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/trips" className="text-sm font-semibold text-field">
              返回旅行列表
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              {trip.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              {trip.startDate} 至 {trip.endDate}
              ，把每天要走的分鏡排成自己的路線。
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

      <TripDetailView trip={trip} />
    </main>
  );
}
