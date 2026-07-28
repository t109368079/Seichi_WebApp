# System Architecture

## Current Architecture

Phase 0 established the engineering harness:

- Next.js App Router for the responsive web app shell.
- React and TypeScript for UI implementation.
- Tailwind CSS for styling.
- Prisma ORM for database access.
- PostgreSQL through Docker Compose for local development and integration tests.
- Vitest for unit and integration tests.
- Playwright for browser E2E tests.

Phase 1 adds the first product slice:

- Domain layer validation for Work, Location, Scene, and SceneStatus concepts.
- Application-layer scene catalog filtering.
- Infrastructure repository functions backed by Prisma.
- Runtime-rendered `/scenes` and `/scenes/[sceneId]` pages.
- Deterministic fictional demo data for catalog validation.

Phase 2 adds the CSV import slice:

- Application-layer Scene Import CSV v1 parser, validation, normalization, and diff calculation.
- Infrastructure repository functions for preview and transaction-backed import commit.
- Runtime-rendered `/imports/scenes` page using server actions.
- Homepage and catalog navigation entry points for import and review of imported scenes.

## Target Layering

Product phases follow this layering:

```text
Presentation Layer
  -> Application Layer
  -> Domain Layer
  -> Infrastructure Layer
```

Phase 2 keeps CSV format concerns at the import adapter/parser boundary. The rest of the app uses a normalized import model so future Google Sheets import can reuse the same validation and commit path. The presentation layer renders catalog and import data but does not call Google APIs or encode external integration rules.

## Adapter Rules

- UI must not directly call Google APIs.
- Google Sheets, Drive, Maps, and storage integrations must sit behind adapters.
- Automated tests must mock external APIs.
- API keys, OAuth secrets, and tokens must never be committed.

## Current Database Boundary

The database now contains:

- `FoundationMetadata`, retained from Phase 0.
- `Work`, representing fictional demo anime works.
- `Location`, representing named places and areas.
- `Scene`, representing permanent scene identities linked to exactly one Work and one Location.
- `SceneStatus`, the legal Phase 1 status enum.

Trip planning, photo binding, review data, Google import data, and storage metadata remain out of scope until later phases.

Phase 2 does not add database tables. CSV import writes to the existing Work, Location, and Scene tables by upsert:

- Work matches by `shortCode`.
- Location matches by `name + areaName`.
- Scene matches by `sceneCode`.
- Existing Scene `status` is preserved.
