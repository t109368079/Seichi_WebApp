import { NextResponse } from "next/server";
import { completeGoogleOAuthConnection } from "@/infrastructure/repositories/google-integration-repository";
import {
  consumeGoogleOAuthStateCookie,
  setGoogleSessionCookie,
} from "@/infrastructure/google/google-session-cookie";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error") ?? "";
  const storedState = await consumeGoogleOAuthStateCookie();

  if (error) {
    return redirectToIntegration(request, "denied");
  }

  if (!code || !state || state !== storedState) {
    return redirectToIntegration(request, "invalid_state");
  }

  try {
    const result = await completeGoogleOAuthConnection(code);
    await setGoogleSessionCookie(result.sessionToken, result.sessionExpiresAt);

    return redirectToIntegration(request, "connected");
  } catch {
    return redirectToIntegration(request, "failed");
  }
}

function redirectToIntegration(
  request: Request,
  message: string,
): NextResponse {
  return NextResponse.redirect(
    new URL(`/integrations/google?googleMessage=${message}`, request.url),
  );
}
