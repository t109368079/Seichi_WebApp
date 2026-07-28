import { assertValidCoordinates, type SceneStatus } from "@/domain/scene";

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
  "latitude",
  "longitude",
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
  latitude: number;
  longitude: number;
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

export function parseSceneImportCsv(csvText: string): SceneImportParseResult {
  const csv = parseCsvRecords(csvText);

  if (csv.records.length === 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          field: "csv",
          message: "CSV header row is required.",
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
      message: "CSV must contain at least one data row.",
    });
  }

  return {
    rows,
    errors,
  };
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
      message: "CSV quoted field is not closed.",
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
        message: `Unknown CSV column: ${header || "(empty)"}.`,
      });
    }

    seenHeaders.set(header, (seenHeaders.get(header) ?? 0) + 1);
  }

  for (const column of sceneImportCsvColumns) {
    if (!headers.includes(column)) {
      errors.push({
        rowNumber,
        field: column,
        message: `Missing CSV column: ${column}.`,
      });
    }
  }

  for (const [header, count] of seenHeaders) {
    if (count > 1) {
      errors.push({
        rowNumber,
        field: header || "header",
        message: `Duplicate CSV column: ${header || "(empty)"}.`,
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
      message: "Row has more values than the CSV header.",
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
        message: `Required value is empty for ${column}.`,
      });
    }

    requiredValues.set(column, value);
  }

  const latitudeText = requiredValues.get("latitude") ?? "";
  const longitudeText = requiredValues.get("longitude") ?? "";
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (latitudeText.length > 0 || longitudeText.length > 0) {
    try {
      assertValidCoordinates({
        latitude,
        longitude,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid latitude or longitude.";
      hasRowError = true;
      errors.push({
        rowNumber: record.rowNumber,
        field: message.includes("longitude") ? "longitude" : "latitude",
        message,
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
    animeImageDriveFileId: requiredValues.get("anime_drive_file_id") ?? "",
    locationName: requiredValues.get("location_name") ?? "",
    areaName: requiredValues.get("area_name") ?? "",
    latitude,
    longitude,
    mapsUrl: readOptionalValue(rawRow, "maps_url"),
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

function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase();
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
        message: `Duplicate scene_code ${row.sceneCode}; first seen on row ${firstRow}.`,
      });
    } else {
      firstSeenRows.set(row.sceneCode, row.rowNumber);
    }
  }

  return errors;
}
