import {
  googleOAuthScopes,
  joinGoogleScopes,
} from "@/application/google-integration";
import { googleFetchJson } from "@/infrastructure/google/google-http";

const googleAuthorizationEndpoint =
  "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleRevokeEndpoint = "https://oauth2.googleapis.com/revoke";
const googleUserInfoEndpoint =
  "https://openidconnect.googleapis.com/v1/userinfo";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: readonly string[];
}

export interface GoogleOAuthConfigStatus {
  configured: boolean;
  missing: string[];
}

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface RawGoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

export class GoogleAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthorizationError";
  }
}

export function getGoogleOAuthConfigStatus(): GoogleOAuthConfigStatus {
  const configValues: Array<{ key: string; value: string | undefined }> = [
    { key: "GOOGLE_CLIENT_ID", value: process.env.GOOGLE_CLIENT_ID },
    { key: "GOOGLE_CLIENT_SECRET", value: process.env.GOOGLE_CLIENT_SECRET },
    { key: "GOOGLE_REDIRECT_URI", value: process.env.GOOGLE_REDIRECT_URI },
    {
      key: "GOOGLE_TOKEN_ENCRYPTION_KEY",
      value: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
    },
  ];

  const missing = configValues
    .filter(({ value }) => !value?.trim())
    .map(({ key }) => key);

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const status = getGoogleOAuthConfigStatus();

  if (!status.configured) {
    throw new GoogleAuthorizationError(
      `Google OAuth config is missing: ${status.missing.join(", ")}.`,
    );
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() ?? "",
    scopes: googleOAuthScopes,
  };
}

export function buildGoogleAuthorizationUrl(
  state: string,
  config = getGoogleOAuthConfig(),
): string {
  const url = new URL(googleAuthorizationEndpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", joinGoogleScopes(config.scopes));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");

  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  config = getGoogleOAuthConfig(),
): Promise<GoogleTokenSet> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  return normalizeTokenResponse(
    await googleFetchJson<RawGoogleTokenResponse>(googleTokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }),
  );
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  config = getGoogleOAuthConfig(),
): Promise<GoogleTokenSet> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  return normalizeTokenResponse(
    await googleFetchJson<RawGoogleTokenResponse>(googleTokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }),
  );
}

export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const user = await googleFetchJson<Partial<GoogleUserInfo>>(
    googleUserInfoEndpoint,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!user.sub || !user.email) {
    throw new GoogleAuthorizationError(
      "Google userinfo did not include required identity fields.",
    );
  }

  return {
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  };
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const body = new URLSearchParams({ token });

  await googleFetchJson<Record<string, never>>(googleRevokeEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

function normalizeTokenResponse(
  response: RawGoogleTokenResponse,
): GoogleTokenSet {
  if (!response.access_token) {
    throw new GoogleAuthorizationError(
      "Google token response did not include an access token.",
    );
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
    scope: response.scope,
  };
}
