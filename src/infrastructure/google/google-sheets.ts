import { parseSceneImportTable } from "@/application/scene-import";
import type { SceneImportParseResult } from "@/application/scene-import";
import {
  GoogleApiError,
  googleFetchJson,
} from "@/infrastructure/google/google-http";

const sheetsValuesEndpoint = "https://sheets.googleapis.com/v4/spreadsheets";

export interface GoogleSheetReadInput {
  spreadsheetId: string;
  range: string;
  accessToken: string;
}

interface GoogleValueRangeResponse {
  values?: unknown[][];
}

export async function readSceneImportFromGoogleSheet(
  input: GoogleSheetReadInput,
): Promise<SceneImportParseResult> {
  const values = await readGoogleSheetValues(input);

  return parseSceneImportTable(values);
}

export async function readGoogleSheetValues({
  spreadsheetId,
  range,
  accessToken,
}: GoogleSheetReadInput): Promise<string[][]> {
  const sheetId = spreadsheetId.trim();
  const sheetRange = range.trim();

  if (!sheetId) {
    throw new GoogleApiError("Google Sheet ID is required.", 400);
  }

  if (!sheetRange) {
    throw new GoogleApiError("Google Sheet range is required.", 400);
  }

  const url = new URL(
    `${sheetsValuesEndpoint}/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(
      sheetRange,
    )}`,
  );
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");

  const response = await googleFetchJson<GoogleValueRangeResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return (response.values ?? []).map((row) =>
    row.map((value) => (value == null ? "" : String(value))),
  );
}
