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

Unit tests must avoid database, network, filesystem, and external API dependencies. Phase 0 unit tests cover foundation-only pure logic and presentational rendering.

## Integration Tests

Integration tests may use PostgreSQL through `TEST_DATABASE_URL`. They must be repeatable and must not use production data.

## E2E Tests

E2E tests use Playwright and should cover high-value user-visible flows. Phase 0 verifies that the homepage renders successfully.

## External Services

No Google APIs are used in Phase 0. Future adapters must be tested with mocks or fixtures.
