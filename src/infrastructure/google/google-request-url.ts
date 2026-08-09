export function buildGoogleIntegrationRedirectUrl(
  request: Request,
  message: string,
): URL {
  const url = new URL("/integrations/google", getAppRequestOrigin(request));
  url.searchParams.set("googleMessage", message);

  return url;
}

export function buildAppRequestUrl(request: Request, pathname: string): URL {
  return new URL(pathname, getAppRequestOrigin(request));
}

export function getAppRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    requestUrl.protocol.replace(/:$/, "") ??
    "http";

  if (host && !host.startsWith("0.0.0.0")) {
    return `${protocol}://${host}`;
  }

  const fallback = new URL(requestUrl);

  if (fallback.hostname === "0.0.0.0") {
    fallback.hostname = "localhost";
  }

  return fallback.origin;
}
