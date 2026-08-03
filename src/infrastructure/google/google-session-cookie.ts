import { cookies } from "next/headers";
import {
  googleOAuthStateCookieName,
  googleSessionCookieName,
} from "@/application/google-integration";

export async function readGoogleSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();

  return cookieStore.get(googleSessionCookieName)?.value;
}

export async function setGoogleSessionCookie(
  sessionToken: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(googleSessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearGoogleSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(googleSessionCookieName);
}

export async function setGoogleOAuthStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(googleOAuthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function consumeGoogleOAuthStateCookie(): Promise<
  string | undefined
> {
  const cookieStore = await cookies();
  const state = cookieStore.get(googleOAuthStateCookieName)?.value;
  cookieStore.delete(googleOAuthStateCookieName);

  return state;
}
