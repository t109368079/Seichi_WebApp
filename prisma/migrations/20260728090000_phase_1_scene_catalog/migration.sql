CREATE TYPE "SceneStatus" AS ENUM (
    'NOT_SHOT',
    'PENDING_REVIEW',
    'REVIEWED',
    'RETAKE_REQUIRED',
    'SKIPPED'
);

CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaName" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "mapsUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "sceneCode" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "episode" TEXT,
    "animeImageDriveFileId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "mapsUrl" TEXT,
    "notes" TEXT,
    "status" "SceneStatus" NOT NULL DEFAULT 'NOT_SHOT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Work_name_key" ON "Work"("name");
CREATE UNIQUE INDEX "Work_shortCode_key" ON "Work"("shortCode");
CREATE UNIQUE INDEX "Location_name_areaName_key" ON "Location"("name", "areaName");
CREATE INDEX "Location_areaName_idx" ON "Location"("areaName");
CREATE UNIQUE INDEX "Scene_sceneCode_key" ON "Scene"("sceneCode");
CREATE INDEX "Scene_workId_idx" ON "Scene"("workId");
CREATE INDEX "Scene_locationId_idx" ON "Scene"("locationId");
CREATE INDEX "Scene_status_idx" ON "Scene"("status");

ALTER TABLE "Scene"
    ADD CONSTRAINT "Scene_workId_fkey"
    FOREIGN KEY ("workId")
    REFERENCES "Work"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "Scene"
    ADD CONSTRAINT "Scene_locationId_fkey"
    FOREIGN KEY ("locationId")
    REFERENCES "Location"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
