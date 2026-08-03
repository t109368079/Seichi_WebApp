import { NextResponse } from "next/server";
import {
  AnimeImageError,
  readAnimeImageForScene,
} from "@/infrastructure/repositories/anime-image-repository";
import { readGoogleSessionCookie } from "@/infrastructure/google/google-session-cookie";

export const dynamic = "force-dynamic";

interface AnimeImageRouteContext {
  params: Promise<{
    sceneId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: AnimeImageRouteContext,
): Promise<NextResponse> {
  const { sceneId } = await context.params;

  try {
    const image = await readAnimeImageForScene(
      sceneId,
      await readGoogleSessionCookie(),
    );

    return new NextResponse(Buffer.from(image.bytes), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": `${image.bytes.byteLength}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    const fallback =
      error instanceof AnimeImageError
        ? buildFallbackSvg(error.message)
        : buildFallbackSvg("讀取動畫參考圖失敗。");

    return new NextResponse(fallback, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, max-age=0, must-revalidate",
        "X-Seichi-Image-Fallback": "true",
      },
    });
  }
}

function buildFallbackSvg(message: string): string {
  const escaped = escapeSvg(message);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640" role="img" aria-label="${escaped}"><rect width="960" height="640" fill="#f6f2e8"/><rect x="48" y="48" width="864" height="544" rx="8" fill="#ffffff" stroke="#c9c1b1" stroke-width="4" stroke-dasharray="16 14"/><text x="480" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#2f2a24">動畫參考圖</text><text x="480" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#6d6254">${escaped}</text></svg>`;
}

function escapeSvg(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
