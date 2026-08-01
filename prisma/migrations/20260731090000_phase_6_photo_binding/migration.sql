CREATE TABLE "ScenePhoto" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "tripId" TEXT,
    "tripDayId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageFileId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takeNumber" INTEGER NOT NULL,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenePhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScenePhoto_storageFileId_key" ON "ScenePhoto"("storageFileId");
CREATE UNIQUE INDEX "ScenePhoto_sceneId_takeNumber_key" ON "ScenePhoto"("sceneId", "takeNumber");
CREATE INDEX "ScenePhoto_sceneId_takeNumber_idx" ON "ScenePhoto"("sceneId", "takeNumber");
CREATE INDEX "ScenePhoto_tripId_idx" ON "ScenePhoto"("tripId");
CREATE INDEX "ScenePhoto_tripDayId_idx" ON "ScenePhoto"("tripDayId");

-- Phase 7 selects one best photo per Scene. The partial unique index makes that
-- invariant a database guarantee rather than an application convention.
CREATE UNIQUE INDEX "ScenePhoto_sceneId_isBest_key"
    ON "ScenePhoto"("sceneId")
    WHERE "isBest" = true;

-- A photo cannot exist without its Scene.
ALTER TABLE "ScenePhoto"
    ADD CONSTRAINT "ScenePhoto_sceneId_fkey"
    FOREIGN KEY ("sceneId")
    REFERENCES "Scene"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Trip and TripDay are capture context only. Deleting a Trip hard deletes its
-- planning rows (D-0018) but must never delete a bound photo, so these null out.
ALTER TABLE "ScenePhoto"
    ADD CONSTRAINT "ScenePhoto_tripId_fkey"
    FOREIGN KEY ("tripId")
    REFERENCES "Trip"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "ScenePhoto"
    ADD CONSTRAINT "ScenePhoto_tripDayId_fkey"
    FOREIGN KEY ("tripDayId")
    REFERENCES "TripDay"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
