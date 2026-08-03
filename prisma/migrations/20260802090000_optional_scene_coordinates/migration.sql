-- Allow CSV imports to provide either a Google Maps URL or explicit coordinates.
-- Scenes without coordinates can still be planned, navigated by mapsUrl, photographed,
-- and reviewed, but they are omitted from the projected local map.
ALTER TABLE "Location" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "Location" ALTER COLUMN "longitude" DROP NOT NULL;

ALTER TABLE "Scene" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "Scene" ALTER COLUMN "longitude" DROP NOT NULL;
