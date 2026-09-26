import { parseSceneImportTable } from "@/application/scene-import";
import type { SceneImportParseResult } from "@/application/scene-import";
import {
  GoogleApiError,
  googleFetchJson,
} from "@/infrastructure/google/google-http";

const sheetsEndpoint = "https://sheets.googleapis.com/v4/spreadsheets";

export interface GoogleSheetReadInput {
  spreadsheetId: string;
  range: string;
  accessToken: string;
}

interface GoogleValueRangeResponse {
  values?: unknown[][];
}

interface GoogleSpreadsheetResponse {
  sheets?: GoogleSheet[];
}

interface GoogleSheet {
  data?: GoogleSheetGridData[];
}

interface GoogleSheetGridData {
  rowData?: GoogleSheetRowData[];
}

interface GoogleSheetRowData {
  values?: GoogleSheetCellData[];
}

export interface GoogleSheetCellData {
  formattedValue?: string;
  hyperlink?: string;
  userEnteredValue?: GoogleSheetExtendedValue;
  effectiveValue?: GoogleSheetExtendedValue;
  userEnteredFormat?: GoogleSheetCellFormat;
  effectiveFormat?: GoogleSheetCellFormat;
  textFormatRuns?: GoogleSheetTextFormatRun[];
  chipRuns?: GoogleSheetChipRun[];
}

interface GoogleSheetExtendedValue {
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
  formulaValue?: string;
}

interface GoogleSheetCellFormat {
  textFormat?: GoogleSheetTextFormat;
}

interface GoogleSheetTextFormatRun {
  format?: GoogleSheetTextFormat;
}

interface GoogleSheetTextFormat {
  link?: {
    uri?: string;
  };
}

interface GoogleSheetChipRun {
  chip?: {
    richLinkProperties?: {
      uri?: string;
    };
  };
}

const linkBackedColumns = new Set(["anime_drive_file_id", "maps_url"]);
const driveHostnames = new Set([
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
]);

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

  const url = new URL(`${sheetsEndpoint}/${encodeURIComponent(sheetId)}`);
  url.searchParams.set("ranges", sheetRange);
  url.searchParams.set("includeGridData", "true");

  const response = await googleFetchJson<
    GoogleSpreadsheetResponse | GoogleValueRangeResponse
  >(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (isGoogleSpreadsheetResponse(response)) {
    return googleSheetCellsToValues(readFirstGridCells(response));
  }

  return googleValueRangeToValues(response);
}

export function googleSheetCellsToValues(
  rows: readonly (readonly GoogleSheetCellData[])[],
): string[][] {
  const headers = (rows[0] ?? []).map((cell) =>
    readGoogleSheetCellValue(cell).trim().toLowerCase(),
  );

  return trimTrailingEmptyRows(
    rows.map((row, rowIndex) => {
      const values = row.map((cell, columnIndex) => {
        if (rowIndex === 0) {
          return readGoogleSheetCellValue(cell);
        }

        return readImportCellValue(cell, headers[columnIndex] ?? "");
      });

      return isEmptyRow(values) ? [] : values;
    }),
  );
}

function googleValueRangeToValues(response: GoogleValueRangeResponse) {
  return (response.values ?? []).map((row) =>
    row.map((value) => (value == null ? "" : String(value))),
  );
}

function isGoogleSpreadsheetResponse(
  response: GoogleSpreadsheetResponse | GoogleValueRangeResponse,
): response is GoogleSpreadsheetResponse {
  return Array.isArray((response as GoogleSpreadsheetResponse).sheets);
}

function readFirstGridCells(
  response: GoogleSpreadsheetResponse,
): GoogleSheetCellData[][] {
  const data = response.sheets?.flatMap((sheet) => sheet.data ?? []) ?? [];
  const rows = data.find((grid) => grid.rowData)?.rowData ?? [];

  return rows.map((row) => row.values ?? []);
}

function readImportCellValue(
  cell: GoogleSheetCellData,
  header: string,
): string {
  const displayedValue = readGoogleSheetCellValue(cell);

  if (!linkBackedColumns.has(header)) {
    return displayedValue;
  }

  return findPreferredCellLink(cell, header) ?? displayedValue;
}

function readGoogleSheetCellValue(cell: GoogleSheetCellData): string {
  return (
    cell.formattedValue ??
    readExtendedValue(cell.effectiveValue) ??
    readExtendedValue(cell.userEnteredValue) ??
    ""
  );
}

function readExtendedValue(
  value?: GoogleSheetExtendedValue,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.stringValue !== undefined) {
    return value.stringValue;
  }

  if (value.numberValue !== undefined) {
    return String(value.numberValue);
  }

  if (value.boolValue !== undefined) {
    return String(value.boolValue);
  }

  if (value.formulaValue !== undefined) {
    return value.formulaValue;
  }

  return undefined;
}

function findPreferredCellLink(
  cell: GoogleSheetCellData,
  header: string,
): string | undefined {
  const links = readCellLinks(cell);

  if (header === "anime_drive_file_id") {
    return links.find(isGoogleDriveUrl);
  }

  if (header === "maps_url") {
    return links.find(isGoogleMapsUrl);
  }

  return undefined;
}

function readCellLinks(cell: GoogleSheetCellData): string[] {
  const links = [
    cell.hyperlink,
    cell.userEnteredFormat?.textFormat?.link?.uri,
    cell.effectiveFormat?.textFormat?.link?.uri,
    ...(cell.textFormatRuns ?? []).map((run) => run.format?.link?.uri),
    ...(cell.chipRuns ?? []).map((run) => run.chip?.richLinkProperties?.uri),
  ];
  const uniqueLinks = new Set<string>();

  for (const link of links) {
    const trimmed = link?.trim();

    if (trimmed) {
      uniqueLinks.add(trimmed);
    }
  }

  return [...uniqueLinks];
}

function isGoogleDriveUrl(value: string): boolean {
  try {
    return driveHostnames.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return (
      hostname === "maps.app.goo.gl" ||
      hostname === "maps.google.com" ||
      hostname === "goo.gl" ||
      ((hostname === "google.com" || hostname === "www.google.com") &&
        url.pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}

function trimTrailingEmptyRows(rows: string[][]): string[][] {
  let lastNonEmptyIndex = rows.length - 1;

  while (lastNonEmptyIndex >= 0 && rows[lastNonEmptyIndex]?.length === 0) {
    lastNonEmptyIndex -= 1;
  }

  return rows.slice(0, lastNonEmptyIndex + 1);
}

function isEmptyRow(values: readonly string[]): boolean {
  return values.every((value) => value.trim().length === 0);
}
