import { NextResponse } from "next/server";
import {
  googleOAuthScopes,
  joinGoogleScopes,
} from "@/application/google-integration";
import { AppAccessError } from "@/application/app-access";
import { setGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";
import {
  createGoogleSessionFromTokens,
  saveGoogleIntegrationSettings,
} from "@/infrastructure/repositories/google-integration-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.GOOGLE_INTEGRATION_TEST_MODE !== "1") {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() || "mock@example.test";

  try {
    const result = await createGoogleSessionFromTokens(
      {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresIn: 3600,
        scope: joinGoogleScopes(googleOAuthScopes),
      },
      {
        sub: `mock-google-user:${email.toLowerCase()}`,
        email,
        name: "Mock Google User",
        picture: "https://example.test/mock.png",
      },
    );

    await saveGoogleIntegrationSettings({
      sheetId: "mock-sheet",
      sheetRange: "Sheet1!A:K",
      drivePhotoFolderId: "mock-drive-folder",
    });
    await setGoogleSessionCookie(result.sessionToken, result.sessionExpiresAt);

    return NextResponse.redirect(
      new URL("/integrations/google?googleMessage=connected", request.url),
    );
  } catch (error) {
    if (error instanceof AppAccessError) {
      return NextResponse.redirect(
        new URL(
          `/integrations/google?googleMessage=app_access_${error.reason}`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL("/integrations/google?googleMessage=failed", request.url),
    );
  }
}
