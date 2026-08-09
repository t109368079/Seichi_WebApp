import { NextResponse } from "next/server";
import { completeGoogleOAuthConnection } from "@/infrastructure/repositories/google-integration-repository";
import {
  googleOAuthStateCookieName,
  googleSessionCookieName,
} from "@/application/google-integration";
import {
  consumeGoogleOAuthStateCookie,
  getGoogleSessionCookieOptions,
} from "@/infrastructure/google/google-session-cookie";
import { buildGoogleIntegrationRedirectUrl } from "@/infrastructure/google/google-request-url";

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
    const response = redirectToIntegration(request, "connected");
    response.cookies.set(
      googleSessionCookieName,
      result.sessionToken,
      getGoogleSessionCookieOptions(result.sessionExpiresAt),
    );
    response.cookies.delete(googleOAuthStateCookieName);

    return response;
  } catch {
    return redirectToIntegration(request, "failed");
  }
}

function redirectToIntegration(
  request: Request,
  message: string,
): NextResponse {
  return NextResponse.redirect(
    buildGoogleIntegrationRedirectUrl(request, message),
  );
}
