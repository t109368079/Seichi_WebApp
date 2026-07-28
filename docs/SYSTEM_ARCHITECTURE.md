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

## Target Layering

Product phases follow this layering:

```text
Presentation Layer
  -> Application Layer
  -> Domain Layer
  -> Infrastructure Layer
```

Phase 1 keeps business rules in pure domain and application modules. The presentation layer renders catalog data but does not call Google APIs or encode external integration rules.

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
