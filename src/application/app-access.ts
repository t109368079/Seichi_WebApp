export const appAllowedGoogleEmailsEnvName = "APP_ALLOWED_GOOGLE_EMAILS";
export const appAccessControlModeEnvName = "APP_ACCESS_CONTROL_MODE";

export type AppAccessControlMode = "production" | "required" | "disabled";
export type AppAccessDeniedReason =
  "missing_allowlist" | "unauthenticated" | "forbidden";

export interface AppAccessEnvironment {
  nodeEnv?: string;
  accessControlMode?: string;
  allowedGoogleEmails?: string;
}

export type AppAccessEvaluation =
  { allowed: true } | { allowed: false; reason: AppAccessDeniedReason };

export class AppAccessError extends Error {
  constructor(readonly reason: AppAccessDeniedReason) {
    super(getAppAccessDeniedMessage(reason));
    this.name = "AppAccessError";
  }
}

export function parseAllowedGoogleEmails(value?: string): string[] {
  const seen = new Set<string>();

  return (value ?? "")
    .split(",")
    .map((email) => normalizeGoogleEmail(email))
    .filter((email) => {
      if (!email || seen.has(email)) {
        return false;
      }

      seen.add(email);
      return true;
    });
}

export function isGoogleEmailAllowed(
  email: string,
  allowedEmails: readonly string[],
): boolean {
  const normalized = normalizeGoogleEmail(email);

  return allowedEmails.some(
    (allowed) => normalizeGoogleEmail(allowed) === normalized,
  );
}

export function getAppAccessControlMode(value?: string): AppAccessControlMode {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "required" || normalized === "disabled") {
    return normalized;
  }

  return "production";
}

export function isAppAccessControlRequired(
  environment = readAppAccessEnvironment(),
): boolean {
  const mode = getAppAccessControlMode(environment.accessControlMode);

  if (mode === "required") {
    return true;
  }

  if (mode === "disabled") {
    return false;
  }

  return environment.nodeEnv === "production";
}

export function evaluateGoogleEmailAppAccess(
  email: string | undefined,
  environment = readAppAccessEnvironment(),
): AppAccessEvaluation {
  if (!isAppAccessControlRequired(environment)) {
    return { allowed: true };
  }

  const allowedEmails = parseAllowedGoogleEmails(
    environment.allowedGoogleEmails,
  );

  if (allowedEmails.length === 0) {
    return { allowed: false, reason: "missing_allowlist" };
  }

  if (!email?.trim()) {
    return { allowed: false, reason: "unauthenticated" };
  }

  if (!isGoogleEmailAllowed(email, allowedEmails)) {
    return { allowed: false, reason: "forbidden" };
  }

  return { allowed: true };
}

export function assertGoogleEmailAllowedForApp(
  email: string | undefined,
  environment = readAppAccessEnvironment(),
): void {
  const access = evaluateGoogleEmailAppAccess(email, environment);

  if (!access.allowed) {
    throw new AppAccessError(access.reason);
  }
}

export function getAppAccessDeniedMessage(
  reason: AppAccessDeniedReason,
): string {
  if (reason === "missing_allowlist") {
    return "Production access requires APP_ALLOWED_GOOGLE_EMAILS.";
  }

  if (reason === "forbidden") {
    return "This Google account is not allowed to use this app.";
  }

  return "Please connect an allowed Google account.";
}

export function getVercelPhotoSourceGuidance(environment = process.env): {
  primarySource: "google-photos" | "local-upload";
  localUploadRole: "small-file-backup" | "primary";
} {
  if (environment.VERCEL === "1" || environment.NODE_ENV === "production") {
    return {
      primarySource: "google-photos",
      localUploadRole: "small-file-backup",
    };
  }

  return {
    primarySource: "local-upload",
    localUploadRole: "primary",
  };
}

function normalizeGoogleEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAppAccessEnvironment(): AppAccessEnvironment {
  return {
    nodeEnv: process.env.NODE_ENV,
    accessControlMode: process.env.APP_ACCESS_CONTROL_MODE,
    allowedGoogleEmails: process.env.APP_ALLOWED_GOOGLE_EMAILS,
  };
}
