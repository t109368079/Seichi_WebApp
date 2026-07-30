import type { Prisma } from "@prisma/client";
import {
  buildTripDaySummary,
  buildTripDetailSummary,
  type TripDayPlanningItem,
  type TripDaySelectionContext,
  type TripDetailItem,
  type TripListItem,
} from "@/application/trip-planning";
import type { SceneCatalogItem } from "@/application/scene-catalog";
import { assertSceneStatus } from "@/domain/scene";
import {
  assertSceneCanBeAddedToTripDay,
  buildTripDayDates,
  getNextTripSceneSortOrder,
  moveTripSceneOrder,
  normalizeTripSceneOrder,
  reorderTripSceneIds,
  tripDateStringToDate,
  tripDateToString,
  type OrderedTripScene,
  type TripSceneMoveDirection,
} from "@/domain/trip";
import { prisma } from "@/infrastructure/database/prisma";

export interface CreateTripInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface TripMutationResult {
  tripId: string;
  tripDayId?: string;
}

export interface LocationTripPlanningData {
  location: {
    id: string;
    name: string;
    areaName?: string;
  };
  scenes: SceneCatalogItem[];
  tripDayContext?: TripDaySelectionContext;
}

type PrismaTransaction = Prisma.TransactionClient;

export async function listTrips(): Promise<TripListItem[]> {
  const trips = await prisma.trip.findMany({
    include: {
      days: {
        include: {
          tripScenes: {
            include: {
              scene: {
                include: {
                  work: true,
                  location: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
    orderBy: [{ startDate: "asc" }, { name: "asc" }],
  });

  return trips.map((trip) => {
    const scenes = trip.days.flatMap((day) =>
      day.tripScenes.map((tripScene) => mapSceneCatalogItem(tripScene.scene)),
    );

    return {
      id: trip.id,
      name: trip.name,
      startDate: tripDateToString(trip.startDate),
      endDate: tripDateToString(trip.endDate),
      dayCount: trip.days.length,
      sceneCount: scenes.length,
      summary: buildTripDaySummary(scenes),
    };
  });
}

export async function createTrip(
  input: CreateTripInput,
): Promise<TripMutationResult> {
  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error("Trip name is required.");
  }

  const dates = buildTripDayDates({
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const trip = await prisma.trip.create({
    data: {
      name,
      startDate: tripDateStringToDate(input.startDate),
      endDate: tripDateStringToDate(input.endDate),
      days: {
        create: dates.map((date) => ({
          date: tripDateStringToDate(date),
        })),
      },
    },
  });

  return {
    tripId: trip.id,
  };
}

export async function deleteTrip(tripId: string): Promise<void> {
  await prisma.trip.delete({
    where: {
      id: tripId,
    },
  });
}

export async function getTripDetail(
  tripId: string,
): Promise<TripDetailItem | null> {
  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
    },
    include: {
      days: {
        include: {
          tripScenes: {
            include: {
              scene: {
                include: {
                  work: true,
                  location: true,
                },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!trip) {
    return null;
  }

  const days = trip.days.map<TripDayPlanningItem>((day) => {
    const scenes = normalizeTripSceneOrder(
      day.tripScenes.map((tripScene) => ({
        id: tripScene.id,
        sortOrder: tripScene.sortOrder,
        scene: mapSceneCatalogItem(tripScene.scene),
      })),
    );

    return {
      id: day.id,
      date: tripDateToString(day.date),
      title: day.title ?? undefined,
      scenes,
      summary: buildTripDaySummary(scenes.map((item) => item.scene)),
    };
  });

  return {
    id: trip.id,
    name: trip.name,
    startDate: tripDateToString(trip.startDate),
    endDate: tripDateToString(trip.endDate),
    days,
    summary: buildTripDetailSummary(days),
  };
}

export async function getTripDaySelectionContext(
  tripDayId: string | undefined,
): Promise<TripDaySelectionContext | undefined> {
  if (!tripDayId) {
    return undefined;
  }

  const tripDay = await prisma.tripDay.findUnique({
    where: {
      id: tripDayId,
    },
    include: {
      trip: true,
      tripScenes: {
        select: {
          sceneId: true,
        },
      },
    },
  });

  if (!tripDay) {
    return undefined;
  }

  return {
    tripDayId: tripDay.id,
    tripId: tripDay.tripId,
    tripName: tripDay.trip.name,
    date: tripDateToString(tripDay.date),
    addedSceneIds: tripDay.tripScenes.map((tripScene) => tripScene.sceneId),
  };
}

export async function addSceneToTripDay(
  tripDayId: string,
  sceneId: string,
): Promise<TripMutationResult> {
  return await prisma.$transaction(async (transaction) => {
    const tripDay = await transaction.tripDay.findUnique({
      where: {
        id: tripDayId,
      },
      include: {
        tripScenes: {
          select: {
            sceneId: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!tripDay) {
      throw new Error("Trip day does not exist.");
    }

    const scene = await transaction.scene.findUnique({
      where: {
        id: sceneId,
      },
      select: {
        id: true,
      },
    });

    if (!scene) {
      throw new Error("Scene does not exist.");
    }

    assertSceneCanBeAddedToTripDay(
      tripDay.tripScenes.map((tripScene) => tripScene.sceneId),
      sceneId,
    );

    await transaction.tripScene.create({
      data: {
        tripDayId,
        sceneId,
        sortOrder: getNextTripSceneSortOrder(
          tripDay.tripScenes.map((tripScene) => ({
            id: tripScene.sceneId,
            sortOrder: tripScene.sortOrder,
          })),
        ),
      },
    });

    return {
      tripId: tripDay.tripId,
      tripDayId,
    };
  });
}

export async function moveTripSceneInDay(
  tripSceneId: string,
  direction: TripSceneMoveDirection,
): Promise<TripMutationResult> {
  return await prisma.$transaction(async (transaction) => {
    const tripScene = await transaction.tripScene.findUnique({
      where: {
        id: tripSceneId,
      },
      include: {
        tripDay: true,
      },
    });

    if (!tripScene) {
      throw new Error("Trip scene does not exist.");
    }

    const orderedScenes = await getTripDayOrder(
      transaction,
      tripScene.tripDayId,
    );
    const reordered = moveTripSceneOrder(orderedScenes, tripSceneId, direction);

    await updateTripSceneOrders(transaction, reordered);

    return {
      tripId: tripScene.tripDay.tripId,
      tripDayId: tripScene.tripDayId,
    };
  });
}

export async function reorderTripDayScenes(
  tripDayId: string,
  orderedTripSceneIds: readonly string[],
): Promise<TripMutationResult> {
  return await prisma.$transaction(async (transaction) => {
    const tripDay = await transaction.tripDay.findUnique({
      where: {
        id: tripDayId,
      },
      select: {
        id: true,
        tripId: true,
      },
    });

    if (!tripDay) {
      throw new Error("Trip day does not exist.");
    }

    const existingScenes = await getTripDayOrder(transaction, tripDayId);
    const existingIds = existingScenes.map((scene) => scene.id).sort();
    const requestedIds = [...orderedTripSceneIds].sort();

    if (existingIds.join("|") !== requestedIds.join("|")) {
      throw new Error("Reorder request does not match the selected trip day.");
    }

    const reordered = reorderTripSceneIds(orderedTripSceneIds);
    await updateTripSceneOrders(transaction, reordered);

    return {
      tripId: tripDay.tripId,
      tripDayId,
    };
  });
}

export async function removeTripScene(
  tripSceneId: string,
): Promise<TripMutationResult> {
  return await prisma.$transaction(async (transaction) => {
    const tripScene = await transaction.tripScene.findUnique({
      where: {
        id: tripSceneId,
      },
      include: {
        tripDay: true,
      },
    });

    if (!tripScene) {
      throw new Error("Trip scene does not exist.");
    }

    await transaction.tripScene.delete({
      where: {
        id: tripSceneId,
      },
    });

    await updateTripSceneOrders(
      transaction,
      normalizeTripSceneOrder(
        await getTripDayOrder(transaction, tripScene.tripDayId),
      ),
    );

    return {
      tripId: tripScene.tripDay.tripId,
      tripDayId: tripScene.tripDayId,
    };
  });
}

export async function getLocationTripPlanningData(
  locationId: string,
  tripDayId: string | undefined,
): Promise<LocationTripPlanningData | null> {
  const [location, tripDayContext] = await Promise.all([
    prisma.location.findUnique({
      where: {
        id: locationId,
      },
      include: {
        scenes: {
          include: {
            work: true,
            location: true,
          },
          orderBy: [{ work: { shortCode: "asc" } }, { sceneCode: "asc" }],
        },
      },
    }),
    getTripDaySelectionContext(tripDayId),
  ]);

  if (!location) {
    return null;
  }

  return {
    location: {
      id: location.id,
      name: location.name,
      areaName: location.areaName ?? undefined,
    },
    scenes: location.scenes.map(mapSceneCatalogItem),
    tripDayContext,
  };
}

function mapSceneCatalogItem(scene: {
  id: string;
  sceneCode: string;
  episode: string | null;
  animeImageDriveFileId: string;
  latitude: number;
  longitude: number;
  mapsUrl: string | null;
  notes: string | null;
  status: string;
  work: {
    id: string;
    name: string;
    shortCode: string;
  };
  location: {
    id: string;
    name: string;
    areaName: string | null;
  };
}): SceneCatalogItem {
  return {
    id: scene.id,
    sceneCode: scene.sceneCode,
    episode: scene.episode ?? undefined,
    animeImageDriveFileId: scene.animeImageDriveFileId,
    latitude: scene.latitude,
    longitude: scene.longitude,
    mapsUrl: scene.mapsUrl ?? undefined,
    notes: scene.notes ?? undefined,
    status: assertSceneStatus(scene.status),
    work: {
      id: scene.work.id,
      name: scene.work.name,
      shortCode: scene.work.shortCode,
    },
    location: {
      id: scene.location.id,
      name: scene.location.name,
      areaName: scene.location.areaName ?? undefined,
    },
  };
}

async function getTripDayOrder(
  transaction: PrismaTransaction,
  tripDayId: string,
): Promise<OrderedTripScene[]> {
  return await transaction.tripScene.findMany({
    where: {
      tripDayId,
    },
    select: {
      id: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

async function updateTripSceneOrders(
  transaction: PrismaTransaction,
  scenes: readonly OrderedTripScene[],
): Promise<void> {
  await Promise.all(
    scenes.map((scene) =>
      transaction.tripScene.update({
        where: {
          id: scene.id,
        },
        data: {
          sortOrder: scene.sortOrder,
        },
      }),
    ),
  );
}
