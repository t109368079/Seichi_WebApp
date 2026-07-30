# Phase 4: Trip Planning

## Objective

Create a trip planning workflow for making trips, generating daily itineraries, adding scenes to a selected day, manually ordering scenes, removing scenes, and viewing trip progress without route optimization.

## Phase Scope

- Trip, TripDay, and TripScene database models.
- `/trips` route for trip list and trip creation.
- `/trips/[tripId]` route for daily itinerary planning, manual ordering, removal, and progress summary.
- `/locations/[locationId]` route for location-scoped scene browsing and add-to-day actions.
- Add-to-day context from Scene Catalog, Scene Detail, Map, and Location pages through `tripDayId`.
- Unit, integration, and E2E tests for trip planning behavior.
- Phase completion summary at `docs/phase4_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- Field Mode.
- Photo upload or ScenePhoto.
- Review workflow.
- Google APIs, route optimization, distance-based ordering, or automatic itinerary sorting.
- Changes to Scene Import CSV v1.

## Blocks

### Block 4.1: Trip And TripDay

Tasks:

- Add Trip and TripDay models.
- Validate `yyyy-mm-dd` date strings and inclusive date ranges.
- Create all TripDay rows automatically when a Trip is created.
- Define hard delete behavior for Trip.

Acceptance Criteria:

- A valid date range creates one Trip and one TripDay per calendar date.
- Invalid dates and reversed ranges are rejected.
- Deleting a Trip cascades TripDay and TripScene rows while preserving Scene data.

### Block 4.2: Add Scene To TripDay

Tasks:

- Add TripScene model and repository use cases.
- Add selected TripDay context to catalog, map, detail, and location pages.
- Show add or already-added state for each Scene.
- Allow removal from Trip Detail.

Acceptance Criteria:

- A Scene can be added to the selected day from catalog, map, detail, or location view.
- Duplicate Scene entries in the same TripDay are prevented.
- A Scene can be removed from a day without deleting the Scene itself.

### Block 4.3: Manual Ordering

Tasks:

- Append new TripScene rows at the end of the selected day.
- Provide drag reorder and up/down fallback controls.
- Persist normalized `sortOrder` values transactionally.

Acceptance Criteria:

- Manual order is preserved after reload.
- Moving and removing scenes keeps a contiguous order starting at 1.
- The system never auto-reorders by map distance or coordinates.

### Block 4.4: Trip Summary

Tasks:

- Aggregate per-trip and per-day scene counts by SceneStatus.
- Show missing or invalid coordinate counts defensively.
- Expose progress summary on Trip Detail and Trip cards.

Acceptance Criteria:

- Summary counts match the scenes currently in the trip.
- Status labels use the same Traditional Chinese labels as Scene Catalog.
- Empty trips and empty days render without errors.

## Required Tests

- Unit: trip date validation and date generation.
- Unit: append, move, reorder, remove order normalization.
- Unit: duplicate scene prevention.
- Unit: trip progress aggregation.
- Integration: create Trip with generated TripDays.
- Integration: add, prevent duplicate, reorder, remove, and reload TripScene order.
- Integration: delete Trip cascades planning rows but preserves Scene rows.
- Integration: summary counts match seeded scene statuses.
- E2E: create a multi-day trip.
- E2E: add scenes from catalog and map.
- E2E: reorder with fallback controls and verify after reload.
- E2E: remove a scene and verify summary updates.

## Verification Commands

```bash
npm run verify
git diff --check
git status --short
```

## Completion Status

Status: Pending final verification

Completed Blocks:

- Block 4.1: Trip And TripDay
- Block 4.2: Add Scene To TripDay
- Block 4.3: Manual Ordering
- Block 4.4: Trip Summary

Verification Results:

- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 6 files and 28 tests
- `npm run db:test:reset`: Passed, applies Phase 0, Phase 1, and Phase 4 migrations
- `npm run test:integration`: Passed, 5 files and 17 tests
- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 8 Playwright tests
- `npm run verify`: Passed

Known Limitations:

- Field Mode remains Phase 5.
- Photo upload, ScenePhoto, and Review remain later phases.
- Google APIs remain deferred to Phase 8.
- Trip ordering is manual only; no route optimization or automatic sorting is implemented.

Commit:

- Message format: `[Phase 4] add trip planning`
- Hash: recorded in the final Phase 4 completion report.
