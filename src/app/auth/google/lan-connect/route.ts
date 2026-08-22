import { NextResponse } from "next/server";
import { AppAccessError } from "@/application/app-access";
import { googleSessionCookieName } from "@/application/google-integration";
import {
  consumeGoogleLanPairingToken,
  isGoogleLanPairingEnabled,
} from "@/infrastructure/google/google-lan-pairing";
import { getGoogleSessionCookieOptions } from "@/infrastructure/google/google-session-cookie";
import { buildGoogleIntegrationRedirectUrl } from "@/infrastructure/google/google-request-url";
import { createGoogleSessionForAccount } from "@/infrastructure/repositories/google-integration-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";

  if (!isGoogleLanPairingEnabled()) {
    return redirectToIntegration(request, "lan_pairing_disabled");
  }

  const accountId = token ? consumeGoogleLanPairingToken(token) : undefined;

  if (!accountId) {
    return redirectToIntegration(request, "lan_pairing_invalid");
  }

  try {
    const result = await createGoogleSessionForAccount(accountId);
    const response = redirectToIntegration(request, "lan_connected");
    response.cookies.set(
      googleSessionCookieName,
      result.sessionToken,
      getGoogleSessionCookieOptions(result.sessionExpiresAt),
    );

    return response;
  } catch (error) {
    if (error instanceof AppAccessError) {
      return redirectToIntegration(request, `app_access_${error.reason}`);
    }

    return redirectToIntegration(request, "lan_pairing_invalid");
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
