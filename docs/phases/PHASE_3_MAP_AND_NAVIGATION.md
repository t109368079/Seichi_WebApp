# Phase 3: Map And Navigation

## Objective

Create a no-external-API map view for browsing scene coordinates, grouped markers, and Google Maps navigation links without adding route optimization or Google API integration.

## Phase Scope

- `/map` route for geographic scene browsing.
- Local coordinate-projected map panel with marker buttons.
- Work, location, and status filters preserved in URL query parameters.
- Marker grouping for exact and nearby coordinates.
- Selected marker detail panel with scene identities, anime image references, and navigation links.
- Google Maps navigation URL generation without calling Google APIs.
- Homepage, Scene Catalog, and Scene Detail navigation entry points.
- Unit, integration, and E2E tests for map and navigation behavior.
- Phase completion summary at `docs/phase3_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- Google Maps JavaScript API, map tiles, API keys, OAuth, or external map services.
- Google Drive anime image loading.
- Route optimization or automatic itinerary sorting.
- Trip, TripDay, TripScene, ScenePhoto, upload, field mode, or review workflows.
- Database schema changes or migrations.

## Blocks

### Block 3.1: Scene Map

Tasks:

- Add `/map`.
- Render scenes with valid coordinates as projected marker buttons.
- Support work, location, and status filters.
- Show selected marker details with anime image reference placeholders.

Acceptance Criteria:

- All seeded scenes with coordinates appear through marker groups.
- Filter results match catalog filtering.
- Missing or invalid coordinates are handled without crashing.
- No external map service or Google API is called.

### Block 3.2: Overlapping Scene Handling

Tasks:

- Group scenes at exact or nearby coordinates using a default `35m` radius.
- Preserve individual Scene identity and Work identity inside grouped details.
- Keep marker ordering deterministic.

Acceptance Criteria:

- Cross-work same-location demo scenes group together.
- Users can open individual Scene detail pages from a marker group.
- Group counts are correct and visible.

### Block 3.3: Navigation Point

Tasks:

- Generate Google Maps navigation URLs from Scene coordinates.
- Add navigation links in map marker details and Scene Detail.
- Disable navigation with a clear reason when coordinates are missing or invalid.

Acceptance Criteria:

- URL format is `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`.
- Links open in a new tab/window with safe `rel`.
- The app does not change trip or itinerary ordering.

## Required Tests

- Unit: Google Maps navigation URL generation.
- Unit: missing and invalid coordinate handling.
- Unit: marker grouping for same and nearby coordinates.
- Unit: projected marker positions stay inside map bounds.
- Unit: map filtering matches catalog filtering.
- Integration: repository returns deterministic map data from seeded scenes.
- Integration: cross-work same-location scenes group together.
- Integration: map filters match catalog filters.
- E2E: `/map` loads demo marker groups and grouped scene identities.
- E2E: map filters update URL and visible scenes.
- E2E: navigation link href is generated correctly without opening Google Maps.

## Verification Commands

```bash
npm run verify
git diff --check
git status --short
```

## Completion Status

Status: Pending final verification

Completed Blocks:

- Block 3.1: Scene Map
- Block 3.2: Overlapping Scene Handling
- Block 3.3: Navigation Point

Verification Results:

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 5 files and 21 tests
- `npm run db:test:reset`: Passed, applies Phase 0 and Phase 1 migrations and seeds 3 works, 6 locations, and 12 scenes
- `npm run test:integration`: Passed, 4 files and 12 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 7 Playwright tests
- `npm run verify`: Passed

Known Limitations:

- Phase 3 renders a local coordinate-projected map, not a real street map.
- Google Maps integration is limited to generated navigation links.
- Anime image thumbnails remain Drive file id placeholders until Google Drive integration.
- Marker grouping uses a fixed `35m` radius and does not optimize routes.

Commit:

- Message format: `[Phase 3] add map navigation`
- Hash: recorded in the final Phase 3 completion report.
