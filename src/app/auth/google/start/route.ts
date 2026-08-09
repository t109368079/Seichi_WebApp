import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildGoogleAuthorizationUrl,
  getGoogleOAuthConfig,
} from "@/infrastructure/google/google-auth-client";
import { googleOAuthStateCookieName } from "@/application/google-integration";
import { getGoogleOAuthStateCookieOptions } from "@/infrastructure/google/google-session-cookie";
import { buildGoogleIntegrationRedirectUrl } from "@/infrastructure/google/google-request-url";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const config = getGoogleOAuthConfig();
    const redirectOrigin = new URL(config.redirectUri).origin;
    const redirectHost = new URL(redirectOrigin).host;
    const requestHost = request.headers.get("host");

    if (requestHost && requestHost !== redirectHost) {
      const requestUrl = new URL(request.url);
      return NextResponse.redirect(
        new URL(`${requestUrl.pathname}${requestUrl.search}`, redirectOrigin),
      );
    }

    const state = randomBytes(24).toString("base64url");
    const authorizationUrl = buildGoogleAuthorizationUrl(state, config);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(
      googleOAuthStateCookieName,
      state,
      getGoogleOAuthStateCookieOptions(),
    );

    return response;
  } catch {
    return NextResponse.redirect(
      buildGoogleIntegrationRedirectUrl(request, "missing_config"),
    );
  }
}
