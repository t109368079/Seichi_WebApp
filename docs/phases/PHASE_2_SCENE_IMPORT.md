# Phase 2: Scene Import

## Objective

Create a CSV-based scene import flow that can preview, validate, and commit prepared scene data before it appears in the existing scene catalog.

## Phase Scope

- Scene Import CSV v1 schema.
- Pure CSV parser, row validation, error reporting, normalization, and import diff calculation.
- Transaction-backed import repository using all-or-nothing upsert.
- `/imports/scenes` web UI for upload, preview, error review, and confirm import.
- Navigation entry points from the homepage and scene catalog.
- Unit, integration, and E2E tests for import behavior.
- Phase completion summary at `docs/phase2_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- Google Sheets import.
- Google Drive image loading.
- Google Maps marker or navigation integration.
- Trip, TripDay, TripScene, ScenePhoto, upload, field mode, or review workflows.
- Importing or overwriting Scene status.
- Deleting existing scenes, works, or locations when absent from CSV.

## Blocks

### Block 2.1: Import Schema

Tasks:

- Define Scene Import CSV v1 columns.
- Define required and optional fields.
- Define normalized import model independent of CSV column names.
- Reject unknown, missing, and duplicate headers.

Acceptance Criteria:

- Required columns are enforced.
- CSV v1 includes `work_short_code` and `area_name` so Work and Location matching does not rely on guessing.
- `status` is not accepted as an import field.
- Parser and validation do not depend on UI, Prisma, Google APIs, or network access.

### Block 2.2: CSV Parser And Validation

Tasks:

- Add CSV parsing with quoted field support.
- Normalize scene and work identifiers.
- Validate required values and coordinates.
- Detect duplicate `scene_code` values inside the uploaded CSV.
- Report errors with field name and CSV row number.

Acceptance Criteria:

- Valid data parses into normalized rows.
- Invalid data produces visible, structured errors.
- Errors are never silently ignored.
- Parser remains a pure application-layer module.

### Block 2.3: Import Preview And Commit

Tasks:

- Compare parsed rows against existing `Scene.sceneCode` values.
- Show create, update, and error counts before write.
- Commit only after explicit user confirmation.
- Write with one database transaction.
- Add imported data to existing `/scenes` and `/scenes/[sceneId]` views.

Acceptance Criteria:

- Preview does not write to the database.
- Confirm import uses all-or-nothing upsert.
- Existing Scene records keep their permanent `id` and existing `status`.
- New Scene records default to `NOT_SHOT`.
- Work matches by `work_short_code`; Location matches by `location_name + area_name`.
- Any validation error prevents all writes.
- Database write failure cannot leave a partial import.

## CSV V1

Columns:

```text
scene_code
work_name
work_short_code
episode
anime_drive_file_id
location_name
area_name
latitude
longitude
maps_url
notes
```

Required columns:

```text
scene_code
work_name
work_short_code
anime_drive_file_id
location_name
area_name
latitude
longitude
```

Optional columns:

```text
episode
maps_url
notes
```

CSV values containing commas, such as some Google Maps URLs or notes, must be quoted according to standard CSV rules.

## Required Tests

- Unit: required column validation.
- Unit: duplicate `scene_code` detection.
- Unit: invalid coordinates with row numbers.
- Unit: empty required values.
- Unit: normalization.
- Unit: import diff calculation.
- Integration: valid CSV import.
- Integration: invalid CSV rollback.
- Integration: existing Scene update preserves status.
- Integration: mixed valid and invalid rows reject the full file.
- Integration: Work and Location creation and matching.
- E2E: import page previews a valid CSV, confirms import, and shows the imported Scene in the catalog.
- E2E: import page reports invalid CSV errors and does not show the commit action.

## Verification Commands

```bash
npm run verify
git diff --check
git status --short
```

## Completion Status

Status: Complete

Completed Blocks:

- Block 2.1: Import Schema
- Block 2.2: CSV Parser And Validation
- Block 2.3: Import Preview And Commit

Verification Results:

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 4 files and 15 tests
- `npm run db:test:reset`: Passed, applies Phase 0 and Phase 1 migrations and seeds 3 works, 6 locations, and 12 scenes
- `npm run test:integration`: Passed, 3 files and 9 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 5 Playwright tests
- `npm run verify`: Passed

Known Limitations:

- Phase 2 uses CSV only; Google Sheets remains Phase 8.
- Anime image file ids are still references only; no Google Drive image loading is implemented.
- CSV preview state is kept in the browser form between preview and confirm, so very large imports may need a future server-side staging mechanism.
- Import updates do not delete source rows that are absent from the CSV.

Commit:

- Message format: `[Phase 2] add scene import`
- Hash: recorded in the final Phase 2 completion report.
