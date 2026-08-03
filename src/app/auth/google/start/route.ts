import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/infrastructure/google/google-auth-client";
import { setGoogleOAuthStateCookie } from "@/infrastructure/google/google-session-cookie";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const state = randomBytes(24).toString("base64url");

  try {
    const authorizationUrl = buildGoogleAuthorizationUrl(state);
    await setGoogleOAuthStateCookie(state);

    return NextResponse.redirect(authorizationUrl);
  } catch {
    return NextResponse.redirect(
      new URL("/integrations/google?googleMessage=missing_config", request.url),
    );
  }
}
