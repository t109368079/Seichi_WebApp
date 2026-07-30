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
  latitude  Float
  longitude Float
  mapsUrl   String?
}

model Scene {
  id                    String
  sceneCode             String
  workId                String
  episode               String?
  animeImageDriveFileId String
  locationId            String
  latitude              Float
  longitude             Float
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
- Latitude and longitude are validated in domain code and stored on Location and Scene.
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
- Existing Scene rows keep their existing `id` and `status`.
- New Scene rows default to `NOT_SHOT`.
- Import does not accept or overwrite status.
- Missing CSV rows do not delete existing data.

## Phase 3 Map View Model

Phase 3 does not add database tables. Map markers are derived from existing Scene coordinates at read time.

Derived map behavior:

- Scene coordinates are validated before map placement.
- Scenes within `35m` are grouped into one marker.
- Marker groups preserve each individual `Scene.id`, `sceneCode`, Work identity, status, and anime image file id reference.
- Google Maps navigation URLs are generated from Scene latitude and longitude.
- No route order, Trip, TripDay, or TripScene data is created in Phase 3.

## Future Product Models

Later phases will add:

- Trip
- TripDay
- TripScene
- ScenePhoto
