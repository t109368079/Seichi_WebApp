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

Phase 3 adds the map and navigation slice, with a later Google Maps embed follow-up:

- Application-layer map utilities for filtering, coordinate validation, Google Maps URL coordinate parsing, marker grouping, coordinate projection, Google Maps embed URL generation, and navigation URL generation.
- Infrastructure repository functions that reuse Scene Catalog data for map rendering.
- Runtime-rendered `/map` page with a Google Maps iframe and client-side selected marker interaction.
- Scene Detail, Scene Catalog, and homepage navigation entry points for map and navigation.

Phase 4 adds the trip planning slice:

- Domain-layer trip date, duplicate, order, and progress rules.
- Application-layer trip DTOs and summary helpers.
- Infrastructure repository functions for transaction-backed Trip, TripDay, and TripScene writes.
- Runtime-rendered `/trips`, `/trips/[tripId]`, and `/locations/[locationId]` pages using server actions.
- Scene Catalog, Scene Detail, Map, and Location pages can carry `tripDayId` context for add-to-day actions.

Phase 5 adds the tablet field mode slice:

- Domain-layer Phase 5 SceneStatus transition table in `src/domain/scene-status.ts`, plus local calendar date derivation in the trip domain.
- Application-layer field cursor, today resolution, completion summary, and action labels.
- Infrastructure repository functions that reuse `getTripDetail` for read paths and apply validated, transaction-backed status writes.
- Runtime-rendered `/field/[tripDayId]` and `/field/[tripDayId]/[tripSceneId]` pages plus the `/trips/[tripId]/field` redirect shortcut.
- Field Mode entry points from the Trip list, Trip Detail day cards, and the homepage copy.

Phase 6 adds the mobile photo binding slice:

- Domain-layer photo validation, take numbering, and upload/removal status resolution in `src/domain/scene-photo.ts`.
- Application-layer photo DTOs, size formatting, and photo route helpers.
- A `PhotoStorageAdapter` boundary with a local filesystem implementation, the first infrastructure adapter in the project.
- Infrastructure repository functions for transactional upload and deletion.
- The project's first route handlers: `POST /api/scene-photos` for upload and `GET /api/scene-photos/[photoId]` for reads.
- A client upload page at `/field/[tripDayId]/[tripSceneId]/upload` and a take gallery on the Field Mode scene page.

Phase 7 adds the review workflow slice:

- Domain-layer review eligibility, best-photo uniqueness, review bucket matching, and review status actions.
- Application-layer review queue filters, summary helpers, status labels, and selected-photo resolution.
- Infrastructure repository functions for review queue reads, scene review detail reads, best-photo selection, and transaction-backed review status writes.
- Runtime-rendered `/reviews` and `/reviews/[sceneId]` pages using server actions.
- Review entry points from the homepage, Scene Detail, and Field Mode take gallery.
- A browser E2E review path that includes real local file upload as setup for selecting the best take.

Phase 8 adds the Google integration slice:

- Application-layer Google scope constants, settings normalization, labels, and route helpers.
- Infrastructure OAuth client functions for Google authorization, token exchange, token refresh, userinfo fetch, and token revocation.
- Infrastructure token crypto and repository functions for encrypted Google tokens, hashed app sessions, and singleton integration settings.
- Google Sheets and Drive adapters that use REST endpoints behind injectable fetch boundaries for tests.
- A UI-facing anime image route at `/api/scenes/[sceneId]/anime-image`, so components never call Drive directly.
- Google Drive photo storage as an optional `PhotoStorageAdapter` backend selected by `PHOTO_STORAGE_BACKEND=google-drive`.
- Runtime-rendered `/integrations/google` settings and connection page plus Google Sheet import controls on `/imports/scenes`.

## Target Layering

Product phases follow this layering:

```text
Presentation Layer
  -> Application Layer
  -> Domain Layer
  -> Infrastructure Layer
```

Phase 2 keeps CSV format concerns at the import adapter/parser boundary. The rest of the app uses a normalized import model so future Google Sheets import can reuse the same validation and commit path.

Phase 3 keeps map behavior in application utilities. The presentation layer renders catalog, import, and map data but does not call Google APIs or encode external integration rules. The map page displays a Google Maps iframe centered on the selected marker group, while marker grouping, filtering, and itinerary actions remain app-owned. When `Scene.mapsUrl` exists, map display and navigation prefer that reference over stored coordinates; supported Google Maps URLs with embedded coordinates are parsed for grouping, and URL-only or query-only Google Maps references become reference-backed marker groups. Scenes without a supported Google Maps reference or valid coordinates are omitted from marker groups, but they still remain available to catalog, trip planning, Field Mode, photo upload, and review.

Phase 4 keeps itinerary ordering in domain/application logic and persists changes through repository transactions. The map can help users discover scenes, but it does not sort or optimize TripScene order.

Phase 5 keeps every status transition rule in one domain module so Phase 6 photo binding and Phase 7 review can extend it rather than add competing rules. Field Mode reads its day through the Phase 4 trip repository, so on-site scene order can never diverge from the planned order. The presentation layer renders an anime reference placeholder and never calls a Google API.

Phase 6 reuses the Phase 5 transition table without modifying it: upload and deletion resolve a target status in the photo domain and then validate it against the same table. Photo bytes cross the `PhotoStorageAdapter` boundary only, so no layer above infrastructure knows the filesystem exists. The upload writes storage inside the database transaction so a storage failure rolls the row back.

Phase 7 extends the shared status transition table for review completion while keeping Field Mode on a capture-scoped action list. Review rules live in `src/domain/review.ts`; repository writes load the Scene and its photos inside one transaction before choosing a best photo or changing review status. No UI calls a storage implementation directly: review image URLs still go through the Phase 6 photo route handler and adapter.

Phase 8 keeps Google API calls in infrastructure only. Presentation components call server actions or app route handlers; repositories resolve sessions, fetch access tokens, and delegate to Sheets, Drive, or storage adapters. Google Sheet import converts `spreadsheets.values.get` rows into the same normalized import model as CSV before validation or commit. Drive anime references are rendered through the app image route, and Drive-backed real photos still cross the existing `PhotoStorageAdapter` boundary.

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
- `ScenePhoto`, representing one real-world take permanently bound to a Scene, with optional Trip and TripDay capture context.
- `GoogleAccount`, representing the connected Google identity and encrypted tokens.
- `GoogleSession`, representing hashed app session cookies tied to Google accounts.
- `GoogleIntegrationSettings`, representing singleton defaults for Sheet import and Drive photo storage.

Google API response payloads and Drive metadata are not stored as product data. Photo bytes are outside the database behind the storage adapter.

Phase 2 does not add database tables. CSV import writes to the existing Work, Location, and Scene tables by upsert:

- Work matches by `shortCode`.
- Location matches by `name + areaName`.
- Scene matches by `sceneCode`.
- Existing Scene `status` is preserved.

Phase 3 does not add database tables. It reads existing Scene coordinates and handles missing or invalid coordinates defensively in application logic. Navigation prefers `Scene.mapsUrl` when present and falls back to generated coordinate navigation.

Phase 4 adds planning tables only. Hard deleting a Trip cascades planning rows but preserves catalog data.

Phase 5 does not add database tables or a migration. It writes only the existing `Scene.status` column, and every write validates against the Phase 5 transition table before the transaction commits.

Phase 6 adds `ScenePhoto`, holding the permanent binding between a real photo and exactly one Scene. Scene deletion cascades to its photos; Trip and TripDay deletion nulls the capture context but preserves the photo. Photo bytes are not stored in the database.

Phase 7 adds no migration. It uses the existing `ScenePhoto.isBest` column and partial unique index, and stores review completion in the existing `Scene.status` enum.

After Phase 7, the optional-coordinate migration makes Scene and Location latitude/longitude nullable so manual CSV imports can use `maps_url` as the primary navigation and map reference. URL-only and query-only Google Maps references are included in marker groups; unsupported HTTP URLs still hand the saved URL to navigation but are not embedded in `/map`.

Phase 8 adds Google integration persistence only. It does not alter Work, Location, Scene, Trip, TripDay, TripScene, or ScenePhoto identity. `Scene.animeImageDriveFileId` remains a Drive file id reference, and `ScenePhoto.storageFileId` remains the storage adapter key.
