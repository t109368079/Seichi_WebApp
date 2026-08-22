import { NextResponse } from "next/server";
import { AppAccessError } from "@/application/app-access";
import { assertAppAccessForSession } from "@/infrastructure/app-access-control";
import {
  createGoogleLanPairingToken,
  isGoogleLanPairingEnabled,
} from "@/infrastructure/google/google-lan-pairing";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import {
  buildAppRequestUrl,
  buildGoogleIntegrationRedirectUrl,
} from "@/infrastructure/google/google-request-url";
import { getGoogleAccountForSession } from "@/infrastructure/repositories/google-integration-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isGoogleLanPairingEnabled()) {
    return redirectToIntegration(request, "lan_pairing_disabled");
  }

  const sessionToken = await readGoogleSessionCookie();

  try {
    await assertAppAccessForSession(sessionToken);
  } catch (error) {
    if (error instanceof AppAccessError) {
      return redirectToIntegration(request, `app_access_${error.reason}`);
    }

    throw error;
  }

  const account = sessionToken
    ? await getGoogleAccountForSession(sessionToken).catch(() => null)
    : null;

  if (!account) {
    return redirectToIntegration(request, "lan_pairing_missing_session");
  }

  const pairing = createGoogleLanPairingToken(account.id);
  const url = buildAppRequestUrl(request, "/integrations/google");
  url.searchParams.set("googleMessage", "lan_pairing_created");
  url.searchParams.set("lanPairingToken", pairing.token);
  url.searchParams.set("lanPairingExpiresAt", pairing.expiresAt.toISOString());

  return NextResponse.redirect(url);
}

function redirectToIntegration(
  request: Request,
  message: string,
): NextResponse {
  return NextResponse.redirect(
    buildGoogleIntegrationRedirectUrl(request, message),
  );
}
