# Data Model

## Phase 0 Model

Phase 0 includes only one foundation model:

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

## Future Product Models

The product domain starts in Phase 1 and later phases:

- Work
- Location
- Scene
- Trip
- TripDay
- TripScene
- ScenePhoto

These models must not be added before their approved phase.

## Identity Rules

Future scene identity will use stable `sceneId` and unique `sceneCode`. Filenames, folder names, and file deletion must not represent scene identity or completion state.
