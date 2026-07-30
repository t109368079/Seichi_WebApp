import Link from "next/link";
import type { TripDaySelectionContext } from "@/application/trip-planning";

export function TripDayContextBanner({
  context,
}: {
  context?: TripDaySelectionContext;
}) {
  if (!context) {
    return null;
  }

  return (
    <div className="rounded border border-[#c3d8ee] bg-[#eef6ff] p-4 text-sm text-night">
      正在加入至：
      <Link
        href={`/trips/${context.tripId}#day-${context.tripDayId}`}
        className="font-semibold text-field underline-offset-4 hover:underline"
      >
        {context.tripName} · {context.date}
      </Link>
    </div>
  );
}
