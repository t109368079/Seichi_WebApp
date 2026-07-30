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

Phase 3 adds the map and navigation slice:

- Application-layer map utilities for filtering, coordinate validation, marker grouping, coordinate projection, and navigation URL generation.
- Infrastructure repository functions that reuse Scene Catalog data for map rendering.
- Runtime-rendered `/map` page with a client-side selected marker interaction.
- Scene Detail, Scene Catalog, and homepage navigation entry points for map and navigation.

Phase 4 adds the trip planning slice:

- Domain-layer trip date, duplicate, order, and progress rules.
- Application-layer trip DTOs and summary helpers.
- Infrastructure repository functions for transaction-backed Trip, TripDay, and TripScene writes.
- Runtime-rendered `/trips`, `/trips/[tripId]`, and `/locations/[locationId]` pages using server actions.
- Scene Catalog, Scene Detail, Map, and Location pages can carry `tripDayId` context for add-to-day actions.

## Target Layering

Product phases follow this layering:

```text
Presentation Layer
  -> Application Layer
  -> Domain Layer
  -> Infrastructure Layer
```

Phase 2 keeps CSV format concerns at the import adapter/parser boundary. The rest of the app uses a normalized import model so future Google Sheets import can reuse the same validation and commit path.

Phase 3 keeps map behavior in application utilities. The presentation layer renders catalog, import, and local map data but does not call Google APIs or encode external integration rules. Google Maps is used only as a generated navigation URL handed off to the browser.

Phase 4 keeps itinerary ordering in domain/application logic and persists changes through repository transactions. The map can help users discover scenes, but it does not sort or optimize TripScene order.

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
- `Trip`, representing a planned trip.
- `TripDay`, representing one calendar day in a trip.
- `TripScene`, representing a Scene manually added to a TripDay with user-controlled order.

Photo binding, review data, Google import data, and storage metadata remain out of scope until later phases.

Phase 2 does not add database tables. CSV import writes to the existing Work, Location, and Scene tables by upsert:

- Work matches by `shortCode`.
- Location matches by `name + areaName`.
- Scene matches by `sceneCode`.
- Existing Scene `status` is preserved.

Phase 3 does not add database tables. It reads existing Scene coordinates and handles missing or invalid coordinates defensively in application logic.

Phase 4 adds planning tables only. Hard deleting a Trip cascades planning rows but preserves catalog data.
