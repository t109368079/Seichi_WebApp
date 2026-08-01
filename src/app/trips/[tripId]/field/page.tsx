import { notFound, redirect } from "next/navigation";
import { getFieldDayHref } from "@/application/field-mode";
import { getLocalTripDateString } from "@/domain/trip";
import { resolveTodayFieldTripDayId } from "@/infrastructure/repositories/field-mode-repository";

export const dynamic = "force-dynamic";

interface TripFieldShortcutPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

/**
 * Resolves "today" to a TripDay and redirects. Field Mode itself is keyed by
 * TripDay identity so it stays deterministic; only this shortcut reads the clock.
 */
export default async function TripFieldShortcutPage({
  params,
}: TripFieldShortcutPageProps) {
  const { tripId } = await params;
  const tripDayId = await resolveTodayFieldTripDayId(
    tripId,
    getLocalTripDateString(new Date()),
  );

  if (!tripDayId) {
    notFound();
  }

  redirect(getFieldDayHref(tripDayId));
}
