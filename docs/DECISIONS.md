# Decisions

## D-0001: Commit Once Per Phase

Status: Accepted

Each phase is committed once after the whole phase is implemented, verified, documented, and reviewed. Blocks remain planning and acceptance units, but they do not require separate commits.

## D-0002: Dedicated Project Repository

Status: Accepted

`D:\Workspace\Seichi_WebApp` is a dedicated Git repository. The parent `D:\Workspace` repository is not used for this project.

## D-0003: Local PostgreSQL Through Docker Compose

Status: Accepted

Phase 0 uses Docker Compose PostgreSQL for deterministic local development and integration tests.

## D-0004: Prisma 6 For Current Node Compatibility

Status: Accepted

The local environment is Node.js 20.13.1. Prisma 7 requires Node `^20.19 || ^22.12 || >=24.0`, so Phase 0 pins Prisma 6.19.3, which supports Node `>=18.18`.

## D-0005: No Product Domain Models In Phase 0

Status: Accepted

Phase 0 includes only a foundation metadata model. Scene, Work, Location, Trip, and photo models begin in later approved phases.

## D-0006: Main Branch

Status: Accepted

The primary branch is `main`.

## D-0007: Phase Commit Message Format

Status: Accepted

Phase completion commits must use `[Phase <n>] <feature>`, for example `[Phase 0] complete foundation`.

## D-0008: Organized Repository Layout

Status: Accepted

Root should keep only required project entrypoints and tool-discovery files. Config files live in `config/`, local infrastructure in `infra/`, maintenance scripts in `scripts/`, application code in `src/`, tests in `tests/`, and canonical requirements in `docs/`.

## D-0009: Fictional Deterministic Demo Catalog

Status: Accepted

Phase 1 uses fictional works, public-place coordinates, and synthetic Drive file ids. Seed data uses deterministic IDs so unit, integration, E2E, and acceptance checks can assert stable cross-work catalog behavior without private Google data.

## D-0010: Dynamic Catalog Pages

Status: Accepted

Scene catalog pages are rendered dynamically at runtime. This keeps production builds independent from a live database connection while preserving Prisma-backed catalog browsing when the app runs.

## D-0011: E2E Uses Test Database

Status: Accepted

Playwright starts the Next.js dev server with `DATABASE_URL` pointed at the test database. This lets `npm run verify` reset and seed the test database before browser tests inspect the scene catalog.

## D-0012: Scene Import CSV V1 Is An Adapter Contract

Status: Accepted

Phase 2 defines CSV v1 with explicit `work_short_code` and `area_name` columns. CSV parsing converts rows into a normalized import model, so future Google Sheets import can reuse validation and commit behavior without coupling the app to CSV column names.

## D-0013: Scene Import Uses All-Or-Nothing Upsert

Status: Accepted

Scene import previews create and update counts before writing. Confirmed imports use a single database transaction and match existing data by `sceneCode`, `workShortCode`, and `locationName + areaName`. Existing Scene status is preserved, new scenes default to `NOT_SHOT`, and any validation error prevents all writes.

## D-0014: Playwright Uses A Dedicated Local Port

Status: Accepted

Playwright uses port `3100` by default, with `E2E_PORT` available for override. This avoids colliding with the normal developer server on port `3000` while keeping browser tests pointed at the test database.

## D-0015: Phase 3 Uses A Local Projected Map

Status: Accepted

Phase 3 renders Scene coordinates with local projection instead of Google Maps JavaScript, external map tiles, or a map service SDK. This keeps map browsing testable without API keys or network access and leaves real map provider integration for a later adapter phase.

## D-0016: Marker Groups Use A 35m Radius

Status: Accepted

Phase 3 groups exact and nearby Scene coordinates within `35m`. This handles cross-work same-location scenes and small coordinate differences without route optimization or automatic itinerary sorting.

## D-0017: E2E Runs With One Worker

Status: Accepted

Playwright uses one worker because the scene import E2E writes to the shared test database. Serial browser execution keeps map and catalog assertions deterministic after `npm run db:test:reset`.

## D-0018: Trip Delete Cascades Planning Rows Only

Status: Accepted

Phase 4 hard deletes Trip rows and cascades TripDay and TripScene rows. Scene, Work, and Location records are preserved because trip planning is a scheduling layer over permanent scene identities.

## D-0019: Trip Creation Generates Days Inclusively

Status: Accepted

Creating a Trip from `startDate` to `endDate` automatically creates one TripDay for every `yyyy-mm-dd` calendar date in the inclusive range. This keeps trip setup fast and avoids a separate manual day-management flow in Phase 4.

## D-0020: Manual Ordering Uses Native Drag And Fallback Buttons

Status: Accepted

Phase 4 uses native browser drag-and-drop for manual ordering and provides up/down buttons as the reliable touch and accessibility fallback. No drag-and-drop dependency is introduced, and the system never auto-sorts itinerary scenes by map distance.

## D-0021: Field Mode Allows Manual PENDING_REVIEW Before Photo Binding

Status: Accepted

Section 8 of the requirements states that uploading the first photo moves a Scene from `NOT_SHOT` to `PENDING_REVIEW`, but photo binding does not exist until Phase 6. Field Mode therefore exposes a manual `待確認` action so the on-site loop can close in Phase 5. Phase 6 adds the automatic photo-triggered transition alongside the manual action rather than replacing the transition table.

## D-0022: REVIEWED Is Terminal In Phase 5

Status: Accepted

The requirements never list `REVIEWED` as a transition source, so Phase 5 gives it no outgoing transitions. A reviewed Scene renders its status with no field actions and an explanation. Introducing `REVIEWED -> RETAKE_REQUIRED` would create an unapproved domain rule; Phase 7 owns review transitions and will extend the table in `src/domain/scene-status.ts`.

## D-0023: Field Mode Routes Use TripDay Identity

Status: Accepted

Field Mode is keyed by TripDay identity at `/field/[tripDayId]` and `/field/[tripDayId]/[tripSceneId]`. `TripDay.id` is globally unique, so the trip id is redundant in the path. `/trips/[tripId]/field` is the only route that reads the clock: it resolves the local calendar date to a TripDay, falls back to the first day, and redirects. This keeps every tested route deterministic while still satisfying the "today itinerary" requirement.

"Today" is derived with `getLocalTripDateString`, not the UTC-based `tripDateToString`, because a UTC-derived date is the previous calendar day for timezones ahead of UTC during early morning hours.

## D-0024: Field Mode E2E Restores Seeded Scene Status

Status: Accepted

The E2E suite shares one test database with a single worker, and Playwright orders spec files by path, so `field-mode.spec.ts` runs before `scene-catalog.spec.ts` and `scene-map.spec.ts`. Both assert exact `RETAKE_REQUIRED` result sets, so the Field Mode spec restores every scene it mutates to its seeded status using the Block 5.3 reversible actions. Each Field Mode test also creates its own trip and navigates by captured URL rather than by trip name, so a re-run against a non-reset database cannot produce ambiguous locators.

## D-0025: Anime Reference Stays A Placeholder Until Phase 8

Status: Accepted

`Scene.animeImageDriveFileId` holds a Drive file id that cannot be resolved to an image without the Phase 8 Drive adapter. Field Mode renders a large placeholder panel carrying the scene code, work, episode, and file id instead of introducing a temporary image source. The panel renders for every status and has no code path that hides it, because deleting the anime image to represent completion is the workflow this product replaces.

## D-0026: Photo Bytes Live Behind A Storage Adapter

Status: Accepted

`PhotoStorageAdapter` is the only boundary that knows where photo bytes live. Phase 6 ships `LocalPhotoStorage`, writing to `PHOTO_STORAGE_DIR` (default `storage/scene-photos`, gitignored). The database stores only `storageFileId`, so Phase 8 replaces the implementation without a schema change or a data migration. Bytes are never stored in PostgreSQL, and uploaded photos are personal data that must never be committed.

## D-0027: Photo Upload Uses A Route Handler

Status: Accepted

Server actions cap the request body at 1MB and phone photos are several megabytes. Upload therefore runs through `POST /api/scene-photos`, and `GET /api/scene-photos/[photoId]` serves stored bytes through the adapter so the browser never sees a filesystem path. These are the project's first route handlers. Everything else, including photo deletion, stays a server action because only upload needs the larger body.

## D-0028: Deleting The Last Photo Reverts To NOT_SHOT

Status: Accepted

Uploading the first photo moves `NOT_SHOT` to `PENDING_REVIEW`, so removing the last photo returns `PENDING_REVIEW` to `NOT_SHOT`. Status then always reflects whether real photos exist, which also keeps requirements section 7.7 satisfied: a Scene with no photo can never sit in a state that Phase 7 would let a user review. Other statuses are left unchanged; `REVIEWED` belongs to Phase 7.

## D-0029: capturedAt Comes From The Browser File Timestamp

Status: Accepted

`capturedAt` is taken from `File.lastModified` at selection time. This needs no EXIF dependency and is usually the capture time for a photo picked from a phone library. It is explicitly a file timestamp, not EXIF `DateTimeOriginal`; Phase 8 can backfill true EXIF when the Drive adapter lands.

## D-0030: Deleting A Trip Preserves Photos

Status: Accepted

`ScenePhoto.tripId` and `ScenePhoto.tripDayId` use `ON DELETE SET NULL`. D-0018 hard deletes a Trip and cascades its planning rows, so a cascading photo relation would destroy real captured work when an old trip is cleaned up. A photo binds to a Scene, which is the permanent identity; trip context is only a record of when it was taken.

## D-0031: The isBest Column Ships In Phase 6 Without Behavior

Status: Accepted

`isBest` is part of the Gate 2 approved data model. Phase 6 creates the column and a partial unique index guaranteeing at most one `isBest = true` row per Scene, but no domain rule or UI reads or writes it. This avoids a second migration in Phase 7 while keeping best-photo selection out of Phase 6 scope.

## D-0032: Phase 7 Uses Existing isBest Storage

Status: Accepted

Phase 7 does not add a schema migration. The review workflow activates the `ScenePhoto.isBest` column and the partial unique index created in Phase 6. Best-photo selection is a transaction that clears previous best flags for the Scene and then marks the selected photo, so the database and domain rule both preserve at most one best photo.

## D-0033: Reviewed Requires A Best Photo

Status: Accepted

`Scene.status = REVIEWED` means review completion, not merely that photos exist. A Scene can move from `PENDING_REVIEW` to `REVIEWED` only when at least one photo is bound and exactly one photo is marked best. The UI disables the reviewed action until this is true, and the repository repeats the check before writing.

## D-0034: Field Mode Stays Capture Only

Status: Accepted

Phase 7 extends the shared status transition table with review transitions, including `PENDING_REVIEW -> REVIEWED`, but Field Mode continues to expose only capture actions. `src/domain/scene-status.ts` therefore keeps a separate Field Mode action list so a tablet user cannot mark a Scene reviewed while standing on site.

## D-0035: Deleting A Best Photo Reopens Review

Status: Accepted

Deleting photos must not leave review completion pointing at a missing take. If a `REVIEWED` Scene loses its best photo and still has other photos, it returns to `PENDING_REVIEW` so the reviewer can choose a replacement. If it loses its last photo, it returns to `NOT_SHOT`. All remaining takes stay bound to the Scene.

## D-0036: Review Buckets Are Derived Filters

Status: Accepted

The review queue does not store bucket state. Buckets are derived from `Scene.status`, photo count, and whether a best photo exists, then combined with work, location, trip, and status filters. The "has photos but no best" bucket can overlap with status buckets because it highlights an actionable review problem rather than a separate status.

## D-0037: Phase 7 E2E Includes Real Upload Setup

Status: Accepted

Phase 6 deferred browser upload E2E coverage by explicit request. Phase 7 adds a review workflow E2E path that creates a trip, uploads multiple local PNG files through the real browser file input, selects the best take, marks the Scene reviewed, and verifies trip progress. This covers the missing upload browser path while keeping review completion as the primary assertion.

## D-0038: Scene Navigation Can Be URL-Only

Status: Accepted

Manual test CSV preparation often starts from Google Maps share URLs, while precise latitude and longitude are harder to collect. Scene and Location coordinates are therefore nullable after Phase 7, and CSV import requires either a complete coordinate pair or `maps_url`. Navigation prefers `maps_url` when present. URL-only Scenes are omitted from the local projected map until coordinates are added, but they can still be planned, opened in Google Maps, photographed, and reviewed.

## D-0039: Phase 7 Follow-Up Preserves Published History

Status: Accepted

The Phase 7 review workflow commit `b1c7063` had already been pushed before the URL-only navigation cleanup was finalized. To avoid rewriting published history, the cleanup is committed separately as `[Phase 7] allow url-only scene navigation` instead of amending the original Phase 7 commit.

## D-0040: Phase 8 Uses Direct Google REST Adapters

Status: Accepted

Phase 8 integrates OAuth, Sheets, and Drive with small infrastructure REST adapters instead of introducing a broad Google client SDK. This keeps the app's external boundary explicit, makes test fetch injection straightforward, and limits the implemented surface to the approved Phase 8 endpoints.

## D-0041: Google Sessions Store Hashes And Tokens Store Ciphertext

Status: Accepted

The browser receives an opaque httpOnly app session token. The database stores only `GoogleSession.sessionTokenHash`, and Google access/refresh tokens are encrypted with `GOOGLE_TOKEN_ENCRYPTION_KEY` before persistence. Revocation is modeled with `revokedAt` so logout and disconnect can invalidate local access without deleting rows.

## D-0042: Google Sheet Import Reuses Scene Import Validation

Status: Accepted

Google Sheets rows from `spreadsheets.values.get` are converted into the same table contract as CSV v1 before validation. Preview and commit therefore share required columns, duplicate Scene code checks, coordinate-or-URL navigation rules, and all-or-nothing transaction behavior with CSV import.

## D-0043: Drive Anime Images Are Served Through An App Route

Status: Accepted

UI components never construct Google Drive media URLs or call Google APIs. They render `/api/scenes/[sceneId]/anime-image`, and that route resolves the active Google session, reads Drive metadata/media through the adapter, validates image MIME types, and returns a stable fallback SVG when auth, permissions, file ids, or content type are not usable.

## D-0044: Drive Photo Storage Is An Optional Adapter Backend

Status: Accepted

Local photo storage remains the default. Setting `PHOTO_STORAGE_BACKEND=google-drive` selects `GoogleDrivePhotoStorage`, which uploads through the Drive adapter and stores the returned Drive file id in `ScenePhoto.storageFileId`. Repository rollback behavior stays storage-agnostic: storage failure prevents database writes, and a later database failure triggers best-effort adapter cleanup.

## D-0045: E2E Google Coverage Uses Test Mode Only

Status: Accepted

Playwright runs with `GOOGLE_INTEGRATION_TEST_MODE=1`, mock OAuth config, and mocked Google REST responses. The test-only mock connection route is unavailable unless that env var is enabled, keeping automated Google coverage deterministic and separate from production accounts or private Drive data.

## D-0046: Only Root Photo Storage Data Is Ignored

Status: Accepted

Uploaded photo bytes remain personal data and are ignored under `/storage/`. The ignore rule is root-anchored so source files under `src/infrastructure/storage/` are tracked. This preserves the adapter boundary in clean clones while still preventing local uploaded photos from entering Git.
