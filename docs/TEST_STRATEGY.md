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
- Google Maps navigation URL generation.
- Missing and invalid map coordinate handling.
- Marker grouping, projected marker bounds, and map filter behavior.

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
- Scene map exposes generated Google Maps navigation hrefs without opening external navigation during tests.

Playwright runs the Next.js dev server on port `3100` by default with `DATABASE_URL` pointed at the test database, so `npm run verify` uses the seeded test data prepared by `npm run db:test:reset`. Set `E2E_PORT` to override the browser test port. Browser tests run with one worker because the scene import E2E writes to the shared test database.

## External Services

No Google APIs are used in Phase 3. Google Maps appears only as generated navigation URLs. Future adapters must be tested with mocks or fixtures and should reuse the normalized import model introduced for CSV.
