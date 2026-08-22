import { notFound } from "next/navigation";
import { requireAppPageAccess } from "@/app/access-control";
import { ReviewSceneView } from "@/components/review-scene-view";
import { getReviewSceneDetail } from "@/infrastructure/repositories/review-repository";

export const dynamic = "force-dynamic";

interface ReviewScenePageProps {
  params: Promise<{
    sceneId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReviewScenePage({
  params,
  searchParams,
}: ReviewScenePageProps) {
  await requireAppPageAccess();

  const { sceneId } = await params;
  const search = await searchParams;
  const detail = await getReviewSceneDetail(sceneId, first(search.photoId));

  if (!detail) {
    notFound();
  }

  return (
    <ReviewSceneView detail={detail} message={first(search.reviewMessage)} />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
