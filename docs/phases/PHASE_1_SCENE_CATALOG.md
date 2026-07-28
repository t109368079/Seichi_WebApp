# Phase 1: Scene Catalog

## Objective

Create the first product domain slice for browsing anime pilgrimage scenes by work, location, and status.

## Phase Scope

- Work, Location, Scene, and SceneStatus domain model.
- Prisma schema and migration for the Phase 1 catalog tables.
- Deterministic demo dataset with 3 works, at least 2 areas, and at least 12 scenes.
- Scene catalog page with work, location, and status filters.
- Scene detail page.
- Unit, integration, and E2E tests for catalog rules and browsing.
- Phase completion summary at `docs/phase1_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- CSV or Google Sheet import.
- Google Drive image loading or Google Maps integration.
- Map markers, marker grouping, or navigation URLs.
- Trip, TripDay, TripScene, ScenePhoto, upload, or review workflows.
- Automatic routing, automatic sorting, or itinerary changes.

## Blocks

### Block 1.1: Domain Model

Tasks:

- Add Work, Location, Scene, and SceneStatus to Prisma.
- Add pure domain validation for scene code uniqueness, latitude, longitude, and status.
- Keep domain code independent of React, Next.js, Prisma, and external APIs.

Acceptance Criteria:

- Scene Code is unique in the database and validated in domain logic.
- Latitude and longitude are validated.
- Status accepts only the legal SceneStatus values.
- Scene identity is represented by `id` and `sceneCode`, not by filenames.
- Domain model has no UI framework dependency.

### Block 1.2: Demo Dataset

Tasks:

- Seed exactly 3 demo works.
- Seed at least 2 demo areas through Location records.
- Seed at least 12 demo scenes.
- Include multiple cross-work scenes at the same location.
- Include multiple scene statuses.

Acceptance Criteria:

- Seed results are repeatable after database reset.
- Demo data is useful for unit, integration, and E2E tests.
- Demo data uses fictional works and synthetic Drive file ids, not private Google data.

### Block 1.3: Scene List

Tasks:

- Add `/scenes` catalog route.
- Add work, location, and status filters.
- Persist filters in URL query parameters.
- Add scene detail route.

Acceptance Criteria:

- Same-location scenes from different works can be displayed together.
- Filter results are correct.
- Filter state survives reload through URL search parameters.
- Users can open a scene detail page from the catalog.

## Required Tests

- Unit: scene code uniqueness validation.
- Unit: latitude and longitude validation.
- Unit: SceneStatus validation.
- Unit: scene filter logic.
- Unit: Work and Location relationship behavior in catalog items.
- Integration: seed creates deterministic works, locations, scenes, statuses, and cross-work same-location scenes.
- Integration: database unique constraint rejects duplicate scene codes.
- Integration: catalog repository filters by work, location, and status.
- E2E: scene catalog loads demo scenes.
- E2E: filters update results and remain after reload.
- E2E: scene detail page can be opened from the catalog.

## Verification Commands

```bash
npm run verify
git diff --check
git status --short
```

## Completion Status

Status: Complete

Completed Blocks:

- Block 1.1: Domain Model
- Block 1.2: Demo Dataset
- Block 1.3: Scene List

Verification Results:

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 3 files and 9 tests
- `npm run db:test:reset`: Passed, applies Phase 0 and Phase 1 migrations and seeds 3 works, 6 locations, and 12 scenes
- `npm run test:integration`: Passed, 2 files and 5 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 3 Playwright tests
- `npm run verify`: Passed

Known Limitations:

- Demo anime image references are synthetic Drive file ids; no Google Drive image loading is implemented in Phase 1.
- `mapsUrl` is stored for catalog data but no map UI or navigation action is implemented until Phase 3.
- Trip, photo binding, upload, and review models remain deferred to later phases.
- Full verification requires Docker Desktop or an equivalent PostgreSQL service running locally.

Commit:

- Message format: `[Phase 1] add scene catalog`
- Hash: recorded in the final Phase 1 completion report
