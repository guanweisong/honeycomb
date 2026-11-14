import Card from "@/components/SectionCard";
import { Link } from "@/app/(blog)/lib/blog-navigation";
import { createServerClient } from "@/app/trpc/server";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { prefetch } from "next/cache";

type RecommendationsProps = {
  categoryId: string;
  locale: ReturnType<typeof normalizeMultiLangLocale>;
  postId: string;
  title: string;
};

export default async function Recommendations({
  categoryId,
  locale,
  postId,
  title,
}: RecommendationsProps) {
  await prefetch();

  const trpc = await createServerClient({
    requestContext: { requestId: "public-recommendation-prefetch" },
    skipRequestObservability: true,
  });

  let recommendations: Awaited<
    ReturnType<typeof trpc.post.getRandomByCategory>
  >;
  try {
    recommendations = await trpc.post.getRandomByCategory({ categoryId });
  } catch {
    // Recommendations are optional and must not replace the article.
    return null;
  }

  const filteredRecommendations = recommendations.filter(
    (item) => item.id !== postId,
  );
  if (filteredRecommendations.length === 0) return null;

  return (
    <Card title={title}>
      <ul className="leading-5 list-outside ml-4 mt-2 list-disc">
        {filteredRecommendations.map((item) => (
          <li key={item.id} className="my-2">
            <Link href={`/archives/${item.id}`} className="link-light">
              {item.title?.[locale] || item.quoteContent?.[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
