import { AppAccessError } from "@/application/app-access";
import {
  evaluateGoogleEmailAppAccess,
  getAppAccessDeniedMessage,
  isAppAccessControlRequired,
  type AppAccessDeniedReason,
  type AppAccessEvaluation,
} from "@/application/app-access";
import { getGoogleAccountForSession } from "@/infrastructure/repositories/google-integration-repository";

export interface AppAccessState {
  access: AppAccessEvaluation;
  email?: string;
}

export async function getAppAccessState(
  sessionToken?: string,
): Promise<AppAccessState> {
  if (!isAppAccessControlRequired()) {
    return { access: { allowed: true } };
  }

  if (!sessionToken) {
    return {
      access: evaluateGoogleEmailAppAccess(undefined),
    };
  }

  const account = await getGoogleAccountForSession(sessionToken).catch(
    () => null,
  );

  return {
    access: evaluateGoogleEmailAppAccess(account?.email),
    email: account?.email,
  };
}

export async function assertAppAccessForSession(
  sessionToken?: string,
): Promise<void> {
  const state = await getAppAccessState(sessionToken);

  if (!state.access.allowed) {
    throw new AppAccessError(state.access.reason);
  }
}

export function getAppAccessDeniedStatus(
  reason: AppAccessDeniedReason,
): number {
  if (reason === "unauthenticated") {
    return 401;
  }

  return 403;
}

export function getAppAccessDeniedBody(reason: AppAccessDeniedReason): {
  message: string;
} {
  return { message: getAppAccessDeniedMessage(reason) };
}
