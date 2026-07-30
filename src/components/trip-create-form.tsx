"use client";

import { useActionState } from "react";
import {
  handleCreateTripAction,
  type TripCreateActionState,
} from "@/app/trips/actions";

const initialState: TripCreateActionState = {};

export function TripCreateForm() {
  const [state, formAction, isPending] = useActionState(
    handleCreateTripAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        旅行名稱
        <input
          name="name"
          required
          className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
          placeholder="例如：東京聖地巡禮"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          開始日期
          <input
            name="startDate"
            type="date"
            required
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          結束日期
          <input
            name="endDate"
            type="date"
            required
            className="min-h-11 rounded border border-rail bg-paper px-3 text-sm"
          />
        </label>
      </div>
      {state.message ? (
        <p className="rounded border border-[#f1c6bb] bg-[#fff2ef] p-3 text-sm text-signal">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-fit rounded bg-field px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "建立中..." : "建立旅行"}
      </button>
    </form>
  );
}
