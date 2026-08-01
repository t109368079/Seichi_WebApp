import { ReviewQueue } from "@/components/review-queue";
import { readReviewQueueFilters } from "@/application/review";
import { getReviewQueueData } from "@/infrastructure/repositories/review-repository";

export const dynamic = "force-dynamic";

interface ReviewsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams;
  const filters = readReviewQueueFilters(params);
  const reviewData = await getReviewQueueData(filters);

  return (
    <ReviewQueue
      items={reviewData.items}
      totalSceneCount={reviewData.totalSceneCount}
      summary={reviewData.summary}
      works={reviewData.works}
      locations={reviewData.locations}
      trips={reviewData.trips}
      filters={filters}
    />
  );
}
