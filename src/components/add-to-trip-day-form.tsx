"use client";

import { addSceneToTripDayAction } from "@/app/trips/actions";

interface AddToTripDayFormProps {
  tripDayId: string;
  sceneId: string;
  sceneCode: string;
  returnTo: string;
  added: boolean;
}

export function AddToTripDayForm({
  tripDayId,
  sceneId,
  sceneCode,
  returnTo,
  added,
}: AddToTripDayFormProps) {
  if (added) {
    return (
      <span className="flex min-h-10 w-fit items-center rounded border border-rail bg-paper px-4 text-sm font-semibold text-night">
        已加入此日
      </span>
    );
  }

  return (
    <form action={addSceneToTripDayAction}>
      <input type="hidden" name="tripDayId" value={tripDayId} />
      <input type="hidden" name="sceneId" value={sceneId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        aria-label={`將 ${sceneCode} 加入此日`}
        className="min-h-10 rounded bg-field px-4 text-sm font-semibold text-white"
      >
        加入此日
      </button>
    </form>
  );
}
