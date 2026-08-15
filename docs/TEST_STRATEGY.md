# Test Strategy

## Verification Entry Point

The canonical verification command is:

```bash
npm run verify
```

It runs:

1. Format check
2. Lint
3. Typecheck
4. Unit tests
5. Test database reset
6. Integration tests
7. Production build
8. E2E tests

## Unit Tests

Unit tests must avoid database, network, filesystem, and external API dependencies.

Current unit coverage includes:

- Foundation summary calculation and UI status rendering.
- SceneStatus validation.
- Latitude and longitude validation.
- Scene code duplicate detection.
- Scene identity remaining separate from anime image file ids.
- Scene catalog filter logic.
- Cross-work same-location catalog behavior.
- Scene Import CSV v1 parsing, required columns, duplicate scene codes, coordinate errors, normalization, and diff calculation.
- Google Maps URL parsing, embed URL generation, and navigation URL generation.
- Missing and invalid map coordinate handling.
- Marker grouping, URL/query-only marker handling, projected marker bounds, and map filter behavior.
- Trip date validation and inclusive TripDay generation.
- TripScene append, move, reorder, removal order normalization, and duplicate prevention.
- Trip progress aggregation by SceneStatus and missing coordinate count.
- Google OAuth scope selection and integration status labels.
- Google settings normalization.
- Google token encryption round trip and wrong-key rejection.
- Google API error translation.
- Google Sheet table parsing through the shared Scene Import validation path.

## Integration Tests

Integration tests may use PostgreSQL through `TEST_DATABASE_URL`. They must be repeatable and must not use production data.

Current integration coverage includes:

- Foundation metadata seed readability.
- Deterministic Phase 1 demo work, location, scene, and status seed data.
- Database rejection of duplicate `sceneCode` values.
- Repository filtering by work, location, and status.
- Valid CSV import into Work, Location, and Scene records.
- Invalid CSV rejection without partial writes.
- Existing Scene update while preserving status.
- Work and Location matching during import.
- Deterministic map data and marker groups from seeded scenes.
- Cross-work same-location marker grouping.
- Map filters matching catalog filters.
- Trip creation with generated TripDays.
- Add Scene to TripDay with duplicate rejection.
- Reorder, move, remove, and reload persisted TripScene order.
- Trip delete cascade for planning rows while preserving Scene rows.
- Trip summary counts from seeded Scene statuses.
- Mock Google OAuth connection creating encrypted account tokens and hashed sessions.
- Expired Google access token refresh updating stored encrypted token data.
- Google logout and revoke disabling usable sessions.
- Mock Google Sheet preview/commit writing through the existing import repository behavior.
- Mock Drive anime image reads and non-image/error handling.
- Google Drive photo storage save/read/delete and upload rollback behavior.

## E2E Tests

E2E tests use Playwright and should cover high-value user-visible flows.

Current E2E coverage includes:

- Homepage renders and links to the scene catalog.
- Scene catalog loads demo data.
- Work, location, and status filters affect visible scenes and persist through URL state.
- Users can open a scene detail page.
- Scene import previews a valid CSV, confirms import, and shows the imported Scene in the catalog.
- Scene import reports invalid CSV errors and withholds the commit action.
- Scene map loads demo marker groups and grouped scene identities.
- Scene map filters through URL query parameters.
- Scene map exposes a Google Maps iframe URL, reference-backed marker groups, and generated Google Maps navigation hrefs without opening external navigation during tests.
- Trip planning creates a multi-day trip, adds scenes from catalog and map, reorders with fallback controls, persists order after reload, and removes scenes.
- Mock Google connection and Google Sheet import smoke path.

Playwright runs the Next.js dev server on port `3100` by default with `DATABASE_URL` pointed at the test database, so `npm run verify` uses the seeded test data prepared by `npm run db:test:reset`. Set `E2E_PORT` to override the browser test port. Browser tests run with one worker because the scene import E2E writes to the shared test database.

## External Services

Google Maps iframe requests are stubbed in E2E tests, and navigation still appears only as generated or saved navigation URLs handed to the browser.

Phase 8 Google OAuth, Sheets, and Drive integrations are tested through mocks:

- Unit tests inject mock fetch behavior and do not touch network, database, or filesystem.
- Integration tests use PostgreSQL plus mocked Google responses only.
- E2E tests enable `GOOGLE_INTEGRATION_TEST_MODE=1`, which exposes a local mock connection route and mocked Google REST responses.
- Automated tests must never use production Google accounts, Sheets, Drive files, OAuth secrets, access tokens, or refresh tokens.
