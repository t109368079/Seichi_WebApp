export type GoogleFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

let injectedGoogleFetch: GoogleFetch | undefined;

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export function setGoogleFetch(fetcher: GoogleFetch | undefined): void {
  injectedGoogleFetch = fetcher;
}

export function getGoogleFetch(): GoogleFetch {
  if (
    !injectedGoogleFetch &&
    process.env.GOOGLE_INTEGRATION_TEST_MODE === "1"
  ) {
    return async (input, init) => {
      const { googleIntegrationTestFetch } =
        await import("@/infrastructure/google/google-test-fetch");

      return googleIntegrationTestFetch(input, init);
    };
  }

  return injectedGoogleFetch ?? ((input, init) => fetch(input, init));
}

export async function googleFetchJson<T>(
  input: string | URL,
  init: RequestInit,
): Promise<T> {
  const response = await getGoogleFetch()(input, init);
  const text = await response.text();
  const body = parseJsonBody(text);

  if (!response.ok) {
    throw new GoogleApiError(
      getGoogleErrorMessage(body) ??
        `Google API request failed: ${response.status}`,
      response.status,
      body,
    );
  }

  return body as T;
}

export async function googleFetchBytes(
  input: string | URL,
  init: RequestInit,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const response = await getGoogleFetch()(input, init);

  if (!response.ok) {
    const text = await response.text();
    const body = parseJsonBody(text);
    throw new GoogleApiError(
      getGoogleErrorMessage(body) ??
        `Google API request failed: ${response.status}`,
      response.status,
      body,
    );
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType:
      response.headers.get("content-type") ?? "application/octet-stream",
  };
}

function parseJsonBody(text: string): unknown {
  if (text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function getGoogleErrorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  if (
    "error_description" in body &&
    typeof body.error_description === "string"
  ) {
    return body.error_description;
  }

  if ("error" in body) {
    const error = body.error;

    if (typeof error === "string") {
      return error;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
  }

  if ("message" in body && typeof body.message === "string") {
    return body.message;
  }

  return undefined;
}
