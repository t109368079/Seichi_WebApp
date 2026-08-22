import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import {
  getAppAccessDeniedBody,
  getAppAccessDeniedStatus,
  getAppAccessState,
} from "@/infrastructure/app-access-control";
import type { AppAccessDeniedReason } from "@/application/app-access";

export async function requireAppPageAccess(): Promise<void> {
  const state = await getAppAccessState(await readGoogleSessionCookie());

  if (!state.access.allowed) {
    redirect(getAppAccessDeniedRedirectHref(state.access.reason));
  }
}

export async function requireAppRouteAccess(): Promise<NextResponse | null> {
  const state = await getAppAccessState(await readGoogleSessionCookie());

  if (state.access.allowed) {
    return null;
  }

  return NextResponse.json(getAppAccessDeniedBody(state.access.reason), {
    status: getAppAccessDeniedStatus(state.access.reason),
  });
}

export async function requireAppActionAccess(): Promise<void> {
  await requireAppPageAccess();
}

export function getAppAccessDeniedRedirectHref(
  reason: AppAccessDeniedReason,
): string {
  const params = new URLSearchParams({ googleMessage: `app_access_${reason}` });

  return `/integrations/google?${params.toString()}`;
}
