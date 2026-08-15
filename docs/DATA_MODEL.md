# Data Model

## Foundation Model

Phase 0 added one foundation model:

```prisma
model FoundationMetadata {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

This model exists only to verify that Prisma migrations, seed data, and integration tests work against PostgreSQL.

## Phase 1 Product Models

Phase 1 introduces the scene catalog models:

```prisma
model Work {
  id          String
  name        String
  shortCode   String
  description String?
}

model Location {
  id        String
  name      String
  areaName  String?
  latitude  Float?
  longitude Float?
  mapsUrl   String?
}

model Scene {
  id                    String
  sceneCode             String
  workId                String
  episode               String?
  animeImageDriveFileId String
  locationId            String
  latitude              Float?
  longitude             Float?
  mapsUrl               String?
  notes                 String?
  status                SceneStatus
}

enum SceneStatus {
  NOT_SHOT
  PENDING_REVIEW
  REVIEWED
  RETAKE_REQUIRED
  SKIPPED
}
```

Phase 1 constraints:

- `Work.name` and `Work.shortCode` are unique.
- `Location.name` plus `Location.areaName` is unique.
- `Scene.sceneCode` is unique.
- Each Scene belongs to exactly one Work and one Location.
- A Scene requires either a complete latitude/longitude pair or `mapsUrl`; `mapsUrl` is preferred for navigation when present.
- Latitude and longitude are validated in domain code when provided and stored on Location and Scene.
- Status values are restricted by the `SceneStatus` enum.

## Identity Rules

Scene identity uses stable `id` and unique `sceneCode`. Filenames, folder names, Drive file ids, and file deletion do not represent scene identity or completion state.

## Phase 2 Import Model

Phase 2 does not add new database models. It adds Scene Import CSV v1 as an external input format that normalizes into the existing Work, Location, and Scene model.

CSV v1 columns:

```text
scene_code
work_name
work_short_code
episode
anime_drive_file_id
location_name
area_name
latitude
longitude
maps_url
notes
```

Import matching and write rules:

- `scene_code` maps to unique `Scene.sceneCode`.
- `work_short_code` maps to unique `Work.shortCode`; `work_name` updates `Work.name`.
- `location_name + area_name` maps to the unique Location key.
- `anime_drive_file_id` accepts either a raw Drive file id or a Google Drive file URL; imports normalize URLs to `Scene.animeImageDriveFileId` before saving.
- `latitude + longitude` values are optional when `maps_url` is present. If one coordinate is provided, both must be provided and valid.
- `maps_url` is optional only when both coordinates are present, and it is the preferred navigation target when present.
- Existing Scene rows keep their existing `id` and `status`.
- New Scene rows default to `NOT_SHOT`.
- Import does not accept or overwrite status.
- Missing CSV rows do not delete existing data.

## Phase 3 Map View Model

Phase 3 does not add database tables. Map markers are derived from existing Scene coordinates and Google Maps URLs at read time.

Derived map behavior:

- `Scene.mapsUrl` is read before stored coordinates when both are present.
- Supported Google Maps URLs with embedded coordinates are parsed before map placement.
- URL-only and query-only Google Maps references are included as selectable marker groups even when they cannot be locally expanded into coordinates.
- Scenes without a supported Google Maps reference or valid coordinates are omitted from marker groups but remain usable in catalog, trip planning, Field Mode, photo upload, and review.
- Scenes within `35m` are grouped into one marker.
- Marker groups preserve each individual `Scene.id`, `sceneCode`, Work identity, status, and anime image file id reference.
- Google Maps navigation uses `Scene.mapsUrl` when present, falling back to a generated URL from Scene latitude and longitude.
- No route order, Trip, TripDay, or TripScene data is created in Phase 3.

## Phase 4 Trip Planning Model

Phase 4 adds itinerary planning tables:

```prisma
model Trip {
  id        String
  name      String
  startDate DateTime
  endDate   DateTime
}

model TripDay {
  id     String
  tripId String
  date   DateTime
  title  String?
}

model TripScene {
  id        String
  tripDayId String
  sceneId   String
  sortOrder Int
}
```

Trip planning rules:

- Dates are accepted as `yyyy-mm-dd`.
- Creating a Trip automatically creates one TripDay for every inclusive date in the range.
- Deleting a Trip cascades its TripDay and TripScene rows while preserving Scene, Work, and Location rows.
- A Scene can appear only once in the same TripDay.
- New TripScene rows append to the end of that day.
- `sortOrder` starts at 1, is manually controlled, and is normalized after reorder or removal.
- The system does not optimize or automatically reorder itinerary scenes by location.

## Phase 5 Field Status Model

Phase 5 does not add database tables or columns. It writes only the existing `Scene.status` column through a validated, transaction-backed update.

Field Mode capture transition table:

```text
NOT_SHOT        -> PENDING_REVIEW, RETAKE_REQUIRED, SKIPPED
PENDING_REVIEW  -> RETAKE_REQUIRED, SKIPPED, NOT_SHOT
RETAKE_REQUIRED -> PENDING_REVIEW, SKIPPED, NOT_SHOT
SKIPPED         -> NOT_SHOT
REVIEWED        -> (no transitions in Phase 5)
```

Field status rules:

- Field Mode actions stay scoped to capture work. The shared status transition table still lives in `src/domain/scene-status.ts`.
- Every transition is reversible, so no status change destroys work state.
- `REVIEWED` is read-only in Field Mode; Phase 7 review routes own review transitions.
- `PENDING_REVIEW` is set manually in Phase 5; Phase 6 adds the photo-triggered transition.
- Status changes never delete, hide, or replace the anime image reference.
- A rejected transition leaves the stored status unchanged.

## Phase 6 Photo Binding Model

Phase 6 adds the ScenePhoto table:

```prisma
model ScenePhoto {
  id            String
  sceneId       String
  tripId        String?
  tripDayId     String?
  fileName      String
  mimeType      String
  fileSize      Int
  storageFileId String
  capturedAt    DateTime?
  uploadedAt    DateTime
  takeNumber    Int
  isBest        Boolean
}
```

Binding and lifecycle rules:

- A photo binds to exactly one Scene, and `sceneId` is required.
- Deleting a Scene cascades its photos; a photo cannot outlive its Scene.
- Deleting a Trip or TripDay nulls `tripId` and `tripDayId` but preserves the photo, because trip context is only a record of when the photo was taken.
- `sceneId + takeNumber` is unique, so concurrent uploads cannot produce duplicate takes.
- Take numbers append past the current maximum and are never reused within a Scene.
- A new upload never overwrites an existing take.
- A partial unique index allows at most one `isBest = true` row per Scene. Phase 6 writes the column default only; Phase 7 owns best photo selection.
- `storageFileId` is the adapter key. Photo bytes live outside the database.
- `capturedAt` is the browser file timestamp, not EXIF `DateTimeOriginal`.

Status coupling:

```text
upload  : NOT_SHOT        -> PENDING_REVIEW
          RETAKE_REQUIRED -> PENDING_REVIEW
          PENDING_REVIEW / SKIPPED / REVIEWED -> unchanged

delete  : PENDING_REVIEW  -> NOT_SHOT   (only when the last photo is removed)
          REVIEWED        -> PENDING_REVIEW (when the best photo is removed and photos remain)
          REVIEWED        -> NOT_SHOT   (when the last photo is removed)
          all other statuses -> unchanged
```

Photo-triggered status targets validate against the shared domain transition table rather than defining separate repository rules.

## Phase 7 Review Workflow Model

Phase 7 adds no migration. It activates the existing `ScenePhoto.isBest` column and its partial unique index.

Review rules:

- A Scene can be marked `REVIEWED` only from `PENDING_REVIEW`.
- A Scene needs at least one photo before it can become `REVIEWED`.
- A reviewed Scene must have exactly one best photo.
- Selecting a best photo clears any previous best photo for the same Scene.
- All takes remain bound to the Scene; selecting or replacing the best photo never deletes or hides older takes.
- `PENDING_REVIEW` can move to `RETAKE_REQUIRED` when the review rejects the current takes.
- `RETAKE_REQUIRED` can move back to `PENDING_REVIEW` when a new take is uploaded or when the reviewer manually returns it.
- If a reviewed Scene loses its best photo while other photos remain, it returns to `PENDING_REVIEW`.
- If a reviewed Scene loses its last photo, it returns to `NOT_SHOT`.
- Field Mode remains capture-only and does not expose review completion actions.

Review queue buckets are derived, not stored:

```text
待確認                 Scene.status = PENDING_REVIEW
需要補拍               Scene.status = RETAKE_REQUIRED
未拍攝                 Scene.status = NOT_SHOT
有照片但未選最佳照片   ScenePhoto count > 0 and no isBest photo
已審核                 Scene.status = REVIEWED
```

The `有照片但未選最佳照片` bucket can overlap with status buckets. It exists so the reviewer can find scenes that have takes but cannot yet be completed.

## Post-Phase 7 Navigation Input Adjustment

The `20260802090000_optional_scene_coordinates` migration makes `Location.latitude`, `Location.longitude`, `Scene.latitude`, and `Scene.longitude` nullable. This supports manual CSV preparation where a Google Maps share URL is easier to collect than precise coordinates.

Current navigation input rules:

- A Scene must have either a complete latitude/longitude pair or `mapsUrl`.
- If one coordinate is provided, both latitude and longitude must be provided and valid.
- `mapsUrl` is preferred for map display and navigation when present.
- URL-only and query-only Google Maps references are included in the map as reference-backed marker groups.
- URL-only Scenes can still be imported, planned into trips, opened in Field Mode, photographed, reviewed, and opened in Google Maps.

## Phase 8 Google Integration Model

Phase 8 adds Google integration tables:

```prisma
model GoogleAccount {
  id                    String
  googleSubject         String
  email                 String
  name                  String?
  pictureUrl            String?
  scopes                String
  encryptedAccessToken  String
  encryptedRefreshToken String?
  accessTokenExpiresAt  DateTime?
  revokedAt             DateTime?
}

model GoogleSession {
  id               String
  accountId        String
  sessionTokenHash String
  expiresAt        DateTime
  revokedAt        DateTime?
}

model GoogleIntegrationSettings {
  id                 String
  sheetId            String?
  sheetRange         String
  drivePhotoFolderId String?
}
```

Google integration rules:

- `GoogleAccount.googleSubject` is the stable external identity from Google OpenID Connect.
- Access and refresh tokens are encrypted before storage with `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- App session cookies store only an opaque token in the browser; the database stores only `sessionTokenHash`.
- Revocation is modeled with `revokedAt` on both accounts and sessions, so local access can be disabled without deleting audit state.
- `GoogleIntegrationSettings` is a singleton row for default Sheet ID/range and Drive photo folder ID.
- `Scene.animeImageDriveFileId` remains the stable Drive file id for anime references and is resolved through an app route.
- With `PHOTO_STORAGE_BACKEND=google-drive`, `ScenePhoto.storageFileId` stores the Drive file id returned by upload. The ScenePhoto relation remains bound to `sceneId`, so Drive file moves or renames do not affect Scene identity.

## Future Product Models

Later phases will add:

- Follow-up operational metadata only when a later approved phase needs it
