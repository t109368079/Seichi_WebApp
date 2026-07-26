# System Architecture

## Phase 0 Architecture

Phase 0 establishes the engineering harness:

- Next.js App Router for the responsive web app shell.
- React and TypeScript for UI implementation.
- Tailwind CSS for styling.
- Prisma ORM for database access.
- PostgreSQL through Docker Compose for local development and integration tests.
- Vitest for unit and integration tests.
- Playwright for browser E2E tests.

## Target Layering

Future product phases follow this layering:

```text
Presentation Layer
  -> Application Layer
  -> Domain Layer
  -> Infrastructure Layer
```

Phase 0 only creates the scaffold needed to support these layers. It intentionally avoids product domain entities.

## Adapter Rules

- UI must not directly call Google APIs.
- Google Sheets, Drive, Maps, and storage integrations must sit behind adapters.
- Automated tests must mock external APIs.
- API keys, OAuth secrets, and tokens must never be committed.

## Current Database Boundary

The only Phase 0 database model is `FoundationMetadata`, used to prove migration, seed, reset, and integration testing work. Product models begin in Phase 1.
