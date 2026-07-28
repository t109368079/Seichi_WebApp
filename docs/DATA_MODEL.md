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

## Future Product Models

Later phases will add:

- Trip
- TripDay
- TripScene
- ScenePhoto
