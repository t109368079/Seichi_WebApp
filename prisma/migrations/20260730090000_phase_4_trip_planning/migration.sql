CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripScene" (
    "id" TEXT NOT NULL,
    "tripDayId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripScene_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Trip_startDate_idx" ON "Trip"("startDate");
CREATE UNIQUE INDEX "TripDay_tripId_date_key" ON "TripDay"("tripId", "date");
CREATE INDEX "TripDay_date_idx" ON "TripDay"("date");
CREATE UNIQUE INDEX "TripScene_tripDayId_sceneId_key" ON "TripScene"("tripDayId", "sceneId");
CREATE INDEX "TripScene_tripDayId_sortOrder_idx" ON "TripScene"("tripDayId", "sortOrder");
CREATE INDEX "TripScene_sceneId_idx" ON "TripScene"("sceneId");

ALTER TABLE "TripDay"
    ADD CONSTRAINT "TripDay_tripId_fkey"
    FOREIGN KEY ("tripId")
    REFERENCES "Trip"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "TripScene"
    ADD CONSTRAINT "TripScene_tripDayId_fkey"
    FOREIGN KEY ("tripDayId")
    REFERENCES "TripDay"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "TripScene"
    ADD CONSTRAINT "TripScene_sceneId_fkey"
    FOREIGN KEY ("sceneId")
    REFERENCES "Scene"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
