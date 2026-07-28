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

## Integration Tests

Integration tests may use PostgreSQL through `TEST_DATABASE_URL`. They must be repeatable and must not use production data.

Current integration coverage includes:

- Foundation metadata seed readability.
- Deterministic Phase 1 demo work, location, scene, and status seed data.
- Database rejection of duplicate `sceneCode` values.
- Repository filtering by work, location, and status.

## E2E Tests

E2E tests use Playwright and should cover high-value user-visible flows.

Current E2E coverage includes:

- Homepage renders and links to the scene catalog.
- Scene catalog loads demo data.
- Work, location, and status filters affect visible scenes and persist through URL state.
- Users can open a scene detail page.

Playwright runs the Next.js dev server with `DATABASE_URL` pointed at the test database, so `npm run verify` uses the seeded test data prepared by `npm run db:test:reset`.

## External Services

No Google APIs are used in Phase 1. Future adapters must be tested with mocks or fixtures.
