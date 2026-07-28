import { PrismaClient } from "@prisma/client";
import { assertUniqueSceneCodes, assertValidCoordinates } from "@/domain/scene";
import { getDatabaseUrl } from "@/lib/env";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? getDatabaseUrl("dev"),
    },
  },
});

const records = [
  ["project", "seichi-pilgrimage-app"],
  ["phase", "0"],
  ["harness", "ready"],
  ["scene-catalog", "ready"],
] as const;

for (const [key, value] of records) {
  await prisma.foundationMetadata.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

const works = [
  {
    id: "work-blue-hour-crossing",
    name: "Blue Hour Crossing",
    shortCode: "BHC",
    description: "A fictional railway coming-of-age series used for demo data.",
  },
  {
    id: "work-station-lights-chronicle",
    name: "Station Lights Chronicle",
    shortCode: "SLC",
    description: "A fictional urban night drama used for demo data.",
  },
  {
    id: "work-after-rain-storyboard",
    name: "After Rain Storyboard",
    shortCode: "ARS",
    description: "A fictional slice-of-life series used for demo data.",
  },
] as const;

const locations = [
  {
    id: "location-ikebukuro-east-gate",
    name: "Ikebukuro Station East Gate",
    areaName: "Ikebukuro",
    latitude: 35.73028,
    longitude: 139.71145,
  },
  {
    id: "location-sunshine-street-crossing",
    name: "Sunshine Street Crossing",
    areaName: "Ikebukuro",
    latitude: 35.72905,
    longitude: 139.71672,
  },
  {
    id: "location-minami-ikebukuro-park",
    name: "Minami-Ikebukuro Park",
    areaName: "Ikebukuro",
    latitude: 35.72815,
    longitude: 139.71335,
  },
  {
    id: "location-otsuka-north-exit",
    name: "Otsuka Station North Exit",
    areaName: "Otsuka",
    latitude: 35.73263,
    longitude: 139.72862,
  },
  {
    id: "location-toden-otsuka-platform",
    name: "Toden Otsuka Platform",
    areaName: "Otsuka",
    latitude: 35.73192,
    longitude: 139.72831,
  },
  {
    id: "location-gokokuji-slope",
    name: "Gokokuji Slope",
    areaName: "Otsuka",
    latitude: 35.71987,
    longitude: 139.72754,
  },
] as const;

const scenes = [
  {
    id: "scene-bhc-001",
    sceneCode: "BHC-001",
    workId: "work-blue-hour-crossing",
    episode: "01",
    animeImageDriveFileId: "demo-drive-bhc-001",
    locationId: "location-ikebukuro-east-gate",
    latitude: 35.73028,
    longitude: 139.71145,
    status: "NOT_SHOT",
    notes: "Morning establishing cut facing the station sign.",
  },
  {
    id: "scene-slc-001",
    sceneCode: "SLC-001",
    workId: "work-station-lights-chronicle",
    episode: "03",
    animeImageDriveFileId: "demo-drive-slc-001",
    locationId: "location-ikebukuro-east-gate",
    latitude: 35.73028,
    longitude: 139.71145,
    status: "PENDING_REVIEW",
    notes: "Night angle from the same station gate position.",
  },
  {
    id: "scene-ars-001",
    sceneCode: "ARS-001",
    workId: "work-after-rain-storyboard",
    episode: "02",
    animeImageDriveFileId: "demo-drive-ars-001",
    locationId: "location-ikebukuro-east-gate",
    latitude: 35.73028,
    longitude: 139.71145,
    status: "REVIEWED",
    notes: "Rainy-day conversation frame at the east gate.",
  },
  {
    id: "scene-bhc-002",
    sceneCode: "BHC-002",
    workId: "work-blue-hour-crossing",
    episode: "02",
    animeImageDriveFileId: "demo-drive-bhc-002",
    locationId: "location-sunshine-street-crossing",
    latitude: 35.72905,
    longitude: 139.71672,
    status: "RETAKE_REQUIRED",
    notes: "Crowded street cut; demo status shows reversible work state.",
  },
  {
    id: "scene-slc-002",
    sceneCode: "SLC-002",
    workId: "work-station-lights-chronicle",
    episode: "04",
    animeImageDriveFileId: "demo-drive-slc-002",
    locationId: "location-sunshine-street-crossing",
    latitude: 35.72905,
    longitude: 139.71672,
    status: "SKIPPED",
    notes: "Same crossing, opposite side of the road.",
  },
  {
    id: "scene-ars-002",
    sceneCode: "ARS-002",
    workId: "work-after-rain-storyboard",
    episode: "05",
    animeImageDriveFileId: "demo-drive-ars-002",
    locationId: "location-minami-ikebukuro-park",
    latitude: 35.72815,
    longitude: 139.71335,
    status: "NOT_SHOT",
    notes: "Bench composition near the park lawn.",
  },
  {
    id: "scene-bhc-003",
    sceneCode: "BHC-003",
    workId: "work-blue-hour-crossing",
    episode: "06",
    animeImageDriveFileId: "demo-drive-bhc-003",
    locationId: "location-otsuka-north-exit",
    latitude: 35.73263,
    longitude: 139.72862,
    status: "PENDING_REVIEW",
    notes: "Arrival scene near the north exit ticket gates.",
  },
  {
    id: "scene-slc-003",
    sceneCode: "SLC-003",
    workId: "work-station-lights-chronicle",
    episode: "07",
    animeImageDriveFileId: "demo-drive-slc-003",
    locationId: "location-otsuka-north-exit",
    latitude: 35.73263,
    longitude: 139.72862,
    status: "NOT_SHOT",
    notes: "Cross-work same-location frame for catalog validation.",
  },
  {
    id: "scene-ars-003",
    sceneCode: "ARS-003",
    workId: "work-after-rain-storyboard",
    episode: "03",
    animeImageDriveFileId: "demo-drive-ars-003",
    locationId: "location-otsuka-north-exit",
    latitude: 35.73263,
    longitude: 139.72862,
    status: "RETAKE_REQUIRED",
    notes: "Needs a cleaner retake without passing traffic.",
  },
  {
    id: "scene-bhc-004",
    sceneCode: "BHC-004",
    workId: "work-blue-hour-crossing",
    episode: "08",
    animeImageDriveFileId: "demo-drive-bhc-004",
    locationId: "location-toden-otsuka-platform",
    latitude: 35.73192,
    longitude: 139.72831,
    status: "REVIEWED",
    notes: "Tram platform cut with static demo Drive reference.",
  },
  {
    id: "scene-slc-004",
    sceneCode: "SLC-004",
    workId: "work-station-lights-chronicle",
    episode: "08",
    animeImageDriveFileId: "demo-drive-slc-004",
    locationId: "location-toden-otsuka-platform",
    latitude: 35.73192,
    longitude: 139.72831,
    status: "PENDING_REVIEW",
    notes: "Evening platform frame for status filtering.",
  },
  {
    id: "scene-ars-004",
    sceneCode: "ARS-004",
    workId: "work-after-rain-storyboard",
    episode: "09",
    animeImageDriveFileId: "demo-drive-ars-004",
    locationId: "location-gokokuji-slope",
    latitude: 35.71987,
    longitude: 139.72754,
    status: "NOT_SHOT",
    notes: "Quiet residential slope cut.",
  },
] as const;

assertUniqueSceneCodes(scenes);

for (const location of locations) {
  assertValidCoordinates(location);
}

for (const scene of scenes) {
  assertValidCoordinates(scene);
}

for (const work of works) {
  await prisma.work.upsert({
    where: { id: work.id },
    update: {
      name: work.name,
      shortCode: work.shortCode,
      description: work.description,
    },
    create: work,
  });
}

for (const location of locations) {
  await prisma.location.upsert({
    where: { id: location.id },
    update: {
      name: location.name,
      areaName: location.areaName,
      latitude: location.latitude,
      longitude: location.longitude,
      mapsUrl: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
    },
    create: {
      ...location,
      mapsUrl: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
    },
  });
}

for (const scene of scenes) {
  await prisma.scene.upsert({
    where: { sceneCode: scene.sceneCode },
    update: {
      workId: scene.workId,
      episode: scene.episode,
      animeImageDriveFileId: scene.animeImageDriveFileId,
      locationId: scene.locationId,
      latitude: scene.latitude,
      longitude: scene.longitude,
      mapsUrl: `https://maps.google.com/?q=${scene.latitude},${scene.longitude}`,
      notes: scene.notes,
      status: scene.status,
    },
    create: {
      ...scene,
      mapsUrl: `https://maps.google.com/?q=${scene.latitude},${scene.longitude}`,
    },
  });
}

await prisma.$disconnect();

console.log(
  `Seeded ${records.length} metadata records, ${works.length} works, ${locations.length} locations, and ${scenes.length} scenes.`,
);
