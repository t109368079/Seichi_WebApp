import {
  assertSceneNavigationReference,
  assertValidCoordinates,
  type SceneStatus,
} from "@/domain/scene";

export const sceneImportCsvColumns = [
  "scene_code",
  "work_name",
  "work_short_code",
  "episode",
  "anime_drive_file_id",
  "location_name",
  "area_name",
  "latitude",
  "longitude",
  "maps_url",
  "notes",
] as const;

export const requiredSceneImportCsvColumns = [
  "scene_code",
  "work_name",
  "work_short_code",
  "anime_drive_file_id",
  "location_name",
  "area_name",
] as const;

const navigationReferenceSceneImportCsvColumns = [
  "latitude",
  "longitude",
  "maps_url",
] as const;

export type SceneImportCsvColumn = (typeof sceneImportCsvColumns)[number];

export interface SceneImportRow {
  rowNumber: number;
  sceneCode: string;
  workName: string;
  workShortCode: string;
  episode?: string;
  animeImageDriveFileId: string;
  locationName: string;
  areaName: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl?: string;
  notes?: string;
}

export interface SceneImportError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface SceneImportParseResult {
  rows: SceneImportRow[];
  errors: SceneImportError[];
}

export type SceneImportAction = "create" | "update";

export interface SceneImportPreviewRow extends SceneImportRow {
  action: SceneImportAction;
}

export interface SceneImportPreview {
  rows: SceneImportPreviewRow[];
  errors: SceneImportError[];
  canCommit: boolean;
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    errorCount: number;
  };
}

export interface ExistingSceneImportRecord {
  sceneCode: string;
  status: SceneStatus;
}

interface CsvRecord {
  rowNumber: number;
  values: string[];
}

const allowedColumnSet = new Set<string>(sceneImportCsvColumns);
const driveHostnames = new Set([
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
]);

export interface GoogleDriveFileReference {
  fileId: string;
  resourceKey?: string;
}

export function getSceneImportColumnRequirementLabel(
  column: SceneImportCsvColumn,
): string {
  if (
    requiredSceneImportCsvColumns.includes(
      column as (typeof requiredSceneImportCsvColumns)[number],
    )
  ) {
    return "是";
  }

  if (
    navigationReferenceSceneImportCsvColumns.includes(
      column as (typeof navigationReferenceSceneImportCsvColumns)[number],
    )
  ) {
    return "座標或 maps_url 擇一";
  }

  return "否";
}

export function parseSceneImportCsv(csvText: string): SceneImportParseResult {
  const csv = parseCsvRecords(csvText);

  if (csv.records.length === 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          field: "csv",
          message: "CSV 需要標題列。",
        },
        ...csv.errors,
      ],
    };
  }

  const [headerRecord, ...dataRecords] = csv.records;
  const headers = headerRecord.values.map((value) => value.trim());
  const headerErrors = validateHeaders(headers, headerRecord.rowNumber);

  if (headerErrors.length > 0) {
    return {
      rows: [],
      errors: [...csv.errors, ...headerErrors],
    };
  }

  const errors = [...csv.errors];
  const rows: SceneImportRow[] = [];

  for (const record of dataRecords) {
    const row = normalizeDataRecord(record, headers, errors);

    if (row) {
      rows.push(row);
    }
  }

  errors.push(...findDuplicateSceneCodeErrors(rows));

  if (rows.length === 0 && errors.length === 0) {
    errors.push({
      rowNumber: headerRecord.rowNumber,
      field: "csv",
      message: "CSV 必須至少包含一筆資料列。",
    });
  }

  return {
    rows,
    errors,
  };
}

export function parseSceneImportTable(
  values: readonly (readonly string[])[],
): SceneImportParseResult {
  return parseSceneImportCsv(sceneImportTableToCsv(values));
}

export function sceneImportTableToCsv(
  values: readonly (readonly string[])[],
): string {
  return values
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

export function buildSceneImportPreview(
  rows: readonly SceneImportRow[],
  existingSceneCodes: readonly string[],
  errors: readonly SceneImportError[] = [],
): SceneImportPreview {
  const existingSceneCodeSet = new Set(existingSceneCodes);
  const previewRows = rows.map<SceneImportPreviewRow>((row) => ({
    ...row,
    action: existingSceneCodeSet.has(row.sceneCode) ? "update" : "create",
  }));
  const createCount = previewRows.filter(
    (row) => row.action === "create",
  ).length;
  const updateCount = previewRows.length - createCount;

  return {
    rows: previewRows,
    errors: [...errors],
    canCommit: errors.length === 0 && previewRows.length > 0,
    summary: {
      totalRows: rows.length,
      createCount,
      updateCount,
      errorCount: errors.length,
    },
  };
}

function parseCsvRecords(csvText: string): {
  records: CsvRecord[];
  errors: SceneImportError[];
} {
  const text = csvText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const records: CsvRecord[] = [];
  const errors: SceneImportError[] = [];
  let values: string[] = [];
  let field = "";
  let inQuotes = false;
  let lineNumber = 1;
  let recordStartLine = 1;

  const pushRecord = () => {
    values.push(field);

    if (!(values.length === 1 && values[0].trim().length === 0)) {
      records.push({
        rowNumber: recordStartLine,
        values,
      });
    }

    values = [];
    field = "";
    recordStartLine = lineNumber + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") {
          lineNumber += 1;
        }

        field += char;
      }

      continue;
    }

    if (char === '"') {
      if (field.length === 0) {
        inQuotes = true;
      } else {
        field += char;
      }
    } else if (char === ",") {
      values.push(field);
      field = "";
    } else if (char === "\n") {
      pushRecord();
      lineNumber += 1;
      recordStartLine = lineNumber;
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    errors.push({
      rowNumber: recordStartLine,
      field: "csv",
      message: "CSV 引號欄位尚未關閉。",
    });
  }

  if (field.length > 0 || values.length > 0) {
    pushRecord();
  }

  return {
    records,
    errors,
  };
}

function validateHeaders(
  headers: readonly string[],
  rowNumber: number,
): SceneImportError[] {
  const errors: SceneImportError[] = [];
  const seenHeaders = new Map<string, number>();

  for (const header of headers) {
    if (!allowedColumnSet.has(header)) {
      errors.push({
        rowNumber,
        field: header || "header",
        message: `未知的 CSV 欄位：${header || "（空白）"}。`,
      });
    }

    seenHeaders.set(header, (seenHeaders.get(header) ?? 0) + 1);
  }

  for (const column of sceneImportCsvColumns) {
    if (!headers.includes(column)) {
      errors.push({
        rowNumber,
        field: column,
        message: `缺少 CSV 欄位：${column}。`,
      });
    }
  }

  for (const [header, count] of seenHeaders) {
    if (count > 1) {
      errors.push({
        rowNumber,
        field: header || "header",
        message: `重複的 CSV 欄位：${header || "（空白）"}。`,
      });
    }
  }

  return errors;
}

function normalizeDataRecord(
  record: CsvRecord,
  headers: readonly string[],
  errors: SceneImportError[],
): SceneImportRow | null {
  if (record.values.length > headers.length) {
    errors.push({
      rowNumber: record.rowNumber,
      field: "csv",
      message: "此列的值多於 CSV 標題欄位。",
    });
  }

  const rawRow = new Map<SceneImportCsvColumn, string>();

  headers.forEach((header, index) => {
    rawRow.set(header as SceneImportCsvColumn, record.values[index] ?? "");
  });

  let hasRowError = false;
  const requiredValues = new Map<SceneImportCsvColumn, string>();

  for (const column of requiredSceneImportCsvColumns) {
    const value = readRequiredValue(rawRow, column);

    if (value.length === 0) {
      hasRowError = true;
      errors.push({
        rowNumber: record.rowNumber,
        field: column,
        message: `${column} 為必填欄位，不能空白。`,
      });
    }

    requiredValues.set(column, value);
  }

  const latitudeText = readOptionalValue(rawRow, "latitude") ?? "";
  const longitudeText = readOptionalValue(rawRow, "longitude") ?? "";
  const mapsUrl = readOptionalValue(rawRow, "maps_url");
  const hasLatitude = latitudeText.length > 0;
  const hasLongitude = longitudeText.length > 0;
  let latitude: number | null = null;
  let longitude: number | null = null;

  if (hasLatitude || hasLongitude) {
    if (!hasLatitude || !hasLongitude) {
      hasRowError = true;
      errors.push({
        rowNumber: record.rowNumber,
        field: hasLatitude ? "longitude" : "latitude",
        message: "latitude 與 longitude 需同時填寫，或只填 maps_url。",
      });
    }

    latitude = hasLatitude ? Number(latitudeText) : null;
    longitude = hasLongitude ? Number(longitudeText) : null;
  }

  if (hasLatitude && hasLongitude) {
    try {
      assertValidCoordinates({
        latitude: latitude as number,
        longitude: longitude as number,
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "";
      const message = rawMessage
        ? translateCoordinateError(rawMessage)
        : "緯度或經度無效。";
      hasRowError = true;
      errors.push({
        rowNumber: record.rowNumber,
        field: rawMessage.includes("longitude") ? "longitude" : "latitude",
        message,
      });
    }
  }

  try {
    assertSceneNavigationReference({
      latitude,
      longitude,
      mapsUrl,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";

    if (rawMessage.includes("requires either coordinates or mapsUrl")) {
      hasRowError = true;
      errors.push({
        rowNumber: record.rowNumber,
        field: "maps_url",
        message: "latitude/longitude 或 maps_url 至少需填一組。",
      });
    }
  }

  if (hasRowError) {
    return null;
  }

  return {
    rowNumber: record.rowNumber,
    sceneCode: normalizeIdentifier(requiredValues.get("scene_code") ?? ""),
    workName: requiredValues.get("work_name") ?? "",
    workShortCode: normalizeIdentifier(
      requiredValues.get("work_short_code") ?? "",
    ),
    episode: readOptionalValue(rawRow, "episode"),
    animeImageDriveFileId: normalizeGoogleDriveFileReference(
      requiredValues.get("anime_drive_file_id") ?? "",
    ),
    locationName: requiredValues.get("location_name") ?? "",
    areaName: requiredValues.get("area_name") ?? "",
    latitude,
    longitude,
    mapsUrl,
    notes: readOptionalValue(rawRow, "notes"),
  };
}

function readRequiredValue(
  rawRow: ReadonlyMap<SceneImportCsvColumn, string>,
  column: SceneImportCsvColumn,
): string {
  return (rawRow.get(column) ?? "").trim();
}

function readOptionalValue(
  rawRow: ReadonlyMap<SceneImportCsvColumn, string>,
  column: SceneImportCsvColumn,
): string | undefined {
  const value = (rawRow.get(column) ?? "").trim();

  return value.length > 0 ? value : undefined;
}

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeGoogleDriveFileReference(value: string): string {
  return parseGoogleDriveFileReference(value).fileId;
}

export function parseGoogleDriveFileReference(
  value: string,
): GoogleDriveFileReference {
  const trimmed = value.trim();

  if (!trimmed) {
    return { fileId: "" };
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return { fileId: trimmed };
  }

  if (!driveHostnames.has(url.hostname.toLowerCase())) {
    return { fileId: trimmed };
  }

  const resourceKey =
    url.searchParams.get("resourcekey")?.trim() ||
    url.searchParams.get("resourceKey")?.trim() ||
    undefined;
  const idFromQuery = url.searchParams.get("id")?.trim();

  if (idFromQuery) {
    return { fileId: idFromQuery, resourceKey };
  }

  const parts = url.pathname
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const dIndex = parts.indexOf("d");

  if (dIndex >= 0 && parts[dIndex + 1]) {
    return {
      fileId: decodeURIComponent(parts[dIndex + 1]),
      resourceKey,
    };
  }

  return { fileId: trimmed, resourceKey };
}

function translateCoordinateError(message: string): string {
  if (message.startsWith("Invalid latitude: ")) {
    return message.replace("Invalid latitude: ", "緯度無效：");
  }

  if (message.startsWith("Invalid longitude: ")) {
    return message.replace("Invalid longitude: ", "經度無效：");
  }

  return message;
}

function findDuplicateSceneCodeErrors(
  rows: readonly SceneImportRow[],
): SceneImportError[] {
  const firstSeenRows = new Map<string, number>();
  const errors: SceneImportError[] = [];

  for (const row of rows) {
    const firstRow = firstSeenRows.get(row.sceneCode);

    if (firstRow) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "scene_code",
        message: `scene_code ${row.sceneCode} 重複；第一次出現在第 ${firstRow} 列。`,
      });
    } else {
      firstSeenRows.set(row.sceneCode, row.rowNumber);
    }
  }

  return errors;
}
