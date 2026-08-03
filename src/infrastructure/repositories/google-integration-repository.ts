import { randomBytes } from "node:crypto";
import {
  defaultGoogleSheetRange,
  googleOAuthScopes,
  googleSessionTtlDays,
  joinGoogleScopes,
  normalizeGoogleIntegrationSettings,
  splitGoogleScopes,
  type GoogleIntegrationSettingsInput,
  type GoogleIntegrationStatus,
} from "@/application/google-integration";
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserInfo,
  getGoogleOAuthConfigStatus,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type GoogleTokenSet,
  type GoogleUserInfo,
} from "@/infrastructure/google/google-auth-client";
import {
  decryptGoogleToken,
  encryptGoogleToken,
  hashGoogleSessionToken,
} from "@/infrastructure/google/token-crypto";
import { prisma } from "@/infrastructure/database/prisma";

const sessionRefreshSkewMs = 60_000;
const settingsSingletonId = "singleton";

export interface GoogleAccountSummary {
  id: string;
  email: string;
  name?: string;
  pictureUrl?: string;
  scopes: string[];
  accessTokenExpiresAt?: string;
  revokedAt?: string;
}

export interface GoogleConnectionResult {
  sessionToken: string;
  sessionExpiresAt: Date;
  account: GoogleAccountSummary;
}

export interface GoogleStoredSettings {
  sheetId: string;
  sheetRange: string;
  drivePhotoFolderId: string;
}

export class GoogleSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSessionError";
  }
}

export async function completeGoogleOAuthConnection(
  code: string,
): Promise<GoogleConnectionResult> {
  const tokenSet = await exchangeGoogleAuthorizationCode(code);
  const userInfo = await fetchGoogleUserInfo(tokenSet.accessToken);

  return createGoogleSessionFromTokens(tokenSet, userInfo);
}

export async function createGoogleSessionFromTokens(
  tokenSet: GoogleTokenSet,
  userInfo: GoogleUserInfo,
): Promise<GoogleConnectionResult> {
  const existing = await prisma.googleAccount.findUnique({
    where: { googleSubject: userInfo.sub },
  });
  const expiresAt = tokenSet.expiresIn
    ? new Date(Date.now() + tokenSet.expiresIn * 1000)
    : null;
  const account = await prisma.googleAccount.upsert({
    where: { googleSubject: userInfo.sub },
    create: {
      googleSubject: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name ?? null,
      pictureUrl: userInfo.picture ?? null,
      scopes: tokenSet.scope ?? joinGoogleScopes(googleOAuthScopes),
      encryptedAccessToken: encryptGoogleToken(tokenSet.accessToken),
      encryptedRefreshToken: tokenSet.refreshToken
        ? encryptGoogleToken(tokenSet.refreshToken)
        : null,
      accessTokenExpiresAt: expiresAt,
      revokedAt: null,
    },
    update: {
      email: userInfo.email,
      name: userInfo.name ?? null,
      pictureUrl: userInfo.picture ?? null,
      scopes:
        tokenSet.scope ??
        existing?.scopes ??
        joinGoogleScopes(googleOAuthScopes),
      encryptedAccessToken: encryptGoogleToken(tokenSet.accessToken),
      encryptedRefreshToken: tokenSet.refreshToken
        ? encryptGoogleToken(tokenSet.refreshToken)
        : (existing?.encryptedRefreshToken ?? null),
      accessTokenExpiresAt: expiresAt,
      revokedAt: null,
    },
  });
  const sessionToken = randomBytes(32).toString("base64url");
  const sessionExpiresAt = new Date(
    Date.now() + googleSessionTtlDays * 24 * 60 * 60 * 1000,
  );

  await prisma.googleSession.create({
    data: {
      accountId: account.id,
      sessionTokenHash: hashGoogleSessionToken(sessionToken),
      expiresAt: sessionExpiresAt,
    },
  });

  return {
    sessionToken,
    sessionExpiresAt,
    account: mapGoogleAccountSummary(account),
  };
}

export async function getGoogleIntegrationStatus(
  sessionToken?: string,
): Promise<GoogleIntegrationStatus> {
  const config = getGoogleOAuthConfigStatus();
  const account = sessionToken
    ? await getGoogleAccountForSession(sessionToken).catch(() => null)
    : null;

  return {
    configured: config.configured,
    connected: account !== null,
    email: account?.email,
    name: account?.name,
    scopes: account?.scopes ?? [],
    expiresAt: account?.accessTokenExpiresAt,
    revokedAt: account?.revokedAt,
    missingConfig: config.missing,
  };
}

export async function getGoogleAccountForSession(
  sessionToken: string,
): Promise<GoogleAccountSummary | null> {
  const session = await findUsableGoogleSession(sessionToken);

  return session ? mapGoogleAccountSummary(session.account) : null;
}

export async function getGoogleAccessTokenForSession(
  sessionToken: string,
): Promise<string> {
  const session = await findUsableGoogleSession(sessionToken);

  if (!session) {
    throw new GoogleSessionError("Google session is missing or expired.");
  }

  const expiresAt = session.account.accessTokenExpiresAt;
  const shouldRefresh =
    !expiresAt || expiresAt.getTime() <= Date.now() + sessionRefreshSkewMs;

  if (!shouldRefresh) {
    return decryptGoogleToken(session.account.encryptedAccessToken);
  }

  if (!session.account.encryptedRefreshToken) {
    throw new GoogleSessionError(
      "Google access token expired and no refresh token is available.",
    );
  }

  const refreshed = await refreshGoogleAccessToken(
    decryptGoogleToken(session.account.encryptedRefreshToken),
  );
  const refreshedExpiresAt = refreshed.expiresIn
    ? new Date(Date.now() + refreshed.expiresIn * 1000)
    : null;

  await prisma.googleAccount.update({
    where: { id: session.account.id },
    data: {
      encryptedAccessToken: encryptGoogleToken(refreshed.accessToken),
      encryptedRefreshToken: refreshed.refreshToken
        ? encryptGoogleToken(refreshed.refreshToken)
        : session.account.encryptedRefreshToken,
      accessTokenExpiresAt: refreshedExpiresAt,
      scopes: refreshed.scope ?? session.account.scopes,
      revokedAt: null,
    },
  });

  return refreshed.accessToken;
}

export async function logoutGoogleSession(
  sessionToken?: string,
): Promise<void> {
  if (!sessionToken) {
    return;
  }

  await prisma.googleSession.updateMany({
    where: {
      sessionTokenHash: hashGoogleSessionToken(sessionToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeGoogleAccountForSession(
  sessionToken?: string,
): Promise<void> {
  if (!sessionToken) {
    return;
  }

  const session = await findGoogleSession(sessionToken);

  if (!session) {
    return;
  }

  const tokenToRevoke = session.account.encryptedRefreshToken
    ? decryptGoogleToken(session.account.encryptedRefreshToken)
    : decryptGoogleToken(session.account.encryptedAccessToken);

  await revokeGoogleToken(tokenToRevoke).catch(() => undefined);

  await prisma.$transaction([
    prisma.googleSession.updateMany({
      where: { accountId: session.accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.googleAccount.update({
      where: { id: session.accountId },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getGoogleIntegrationSettings(): Promise<GoogleStoredSettings> {
  const settings = await prisma.googleIntegrationSettings.findUnique({
    where: { id: settingsSingletonId },
  });

  return normalizeGoogleIntegrationSettings({
    sheetId: settings?.sheetId ?? undefined,
    sheetRange: settings?.sheetRange ?? defaultGoogleSheetRange,
    drivePhotoFolderId:
      settings?.drivePhotoFolderId ??
      process.env.GOOGLE_PHOTO_FOLDER_ID ??
      undefined,
  });
}

export async function saveGoogleIntegrationSettings(
  input: GoogleIntegrationSettingsInput,
): Promise<GoogleStoredSettings> {
  const normalized = normalizeGoogleIntegrationSettings(input);
  const settings = await prisma.googleIntegrationSettings.upsert({
    where: { id: settingsSingletonId },
    create: {
      id: settingsSingletonId,
      sheetId: normalized.sheetId || null,
      sheetRange: normalized.sheetRange,
      drivePhotoFolderId: normalized.drivePhotoFolderId || null,
    },
    update: {
      sheetId: normalized.sheetId || null,
      sheetRange: normalized.sheetRange,
      drivePhotoFolderId: normalized.drivePhotoFolderId || null,
    },
  });

  return normalizeGoogleIntegrationSettings({
    sheetId: settings.sheetId ?? undefined,
    sheetRange: settings.sheetRange,
    drivePhotoFolderId: settings.drivePhotoFolderId ?? undefined,
  });
}

async function findUsableGoogleSession(sessionToken: string) {
  const session = await findGoogleSession(sessionToken);

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now() ||
    session.account.revokedAt
  ) {
    return null;
  }

  return session;
}

async function findGoogleSession(sessionToken: string) {
  return prisma.googleSession.findUnique({
    where: { sessionTokenHash: hashGoogleSessionToken(sessionToken) },
    include: { account: true },
  });
}

function mapGoogleAccountSummary(account: {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  scopes: string;
  accessTokenExpiresAt: Date | null;
  revokedAt: Date | null;
}): GoogleAccountSummary {
  return {
    id: account.id,
    email: account.email,
    name: account.name ?? undefined,
    pictureUrl: account.pictureUrl ?? undefined,
    scopes: splitGoogleScopes(account.scopes),
    accessTokenExpiresAt: account.accessTokenExpiresAt?.toISOString(),
    revokedAt: account.revokedAt?.toISOString(),
  };
}
