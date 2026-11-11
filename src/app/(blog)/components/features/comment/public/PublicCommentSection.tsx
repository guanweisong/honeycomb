import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { createServerClient } from "@/app/trpc/server";
import { CommentListContent } from "@/app/(blog)/components/features/comment/public/components/CommentClient";
import Card from "@/components/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { MenuType } from "@/features/menu/types/menu.type";
import type { MultiLangEnum } from "@/lib/i18n/i18n";

export function PublicCommentSectionSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      <Card
        title={
          <Skeleton
            aria-hidden="true"
            className="inline-block h-5 w-20 rounded-sm bg-auto-front-gray/10 align-middle"
          />
        }
      >
        <ul aria-hidden="true" className="list-none">
          {[0, 1, 2].map((item) => (
            <li key={item} className="relative">
              <div className="overflow-hidden border-b-0.5 border-dashed border-auto-front-gray/50 py-4">
                <Skeleton className="float-left mr-5 h-12 w-12 rounded-none bg-auto-front-gray/10" />
                <div className="overflow-hidden">
                  <Skeleton className="h-4 w-20 rounded-sm bg-auto-front-gray/10" />
                  <div className="mt-2 space-y-1">
                    <Skeleton className="h-4 w-11/12 rounded-sm bg-auto-front-gray/10 max-md:w-full" />
                    <Skeleton className="h-4 w-3/5 rounded-sm bg-auto-front-gray/10 max-md:w-4/5" />
                  </div>
                </div>
                <div className="absolute right-2 top-4 flex items-center gap-2">
                  <Skeleton className="h-3 w-16 rounded-sm bg-auto-front-gray/10" />
                  <Skeleton className="h-3 w-8 rounded-sm bg-auto-front-gray/10" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export const loadOptionalPublicComments = cache(
  async (id: string, type: MenuType) => {
    try {
      await connection();
      const trpc = await createServerClient();
      return await trpc.comment.listByRef({ id, type });
    } catch (error) {
      unstable_rethrow(error);
      // A comment failure or a concurrent disable must not replace public content.
      return null;
    }
  },
);

export async function PublicCommentCount({
  id,
  type,
  locale,
}: {
  id: string;
  type: MenuType;
  locale: MultiLangEnum;
}) {
  const [comments, t] = await Promise.all([
    loadOptionalPublicComments(id, type),
    getTranslations({ locale, namespace: "PostInfo" }),
  ]);
  return comments ? t("messages", { count: comments.total }) : null;
}

export async function PublicCommentSection({
  id,
  type,
  locale,
}: {
  id: string;
  type: MenuType;
  locale: MultiLangEnum;
}) {
  const result = await loadOptionalPublicComments(id, type);
  if (!result) {
    const t = await getTranslations({ locale, namespace: "Comment" });
    return (
      <p className="my-3 text-sm text-auto-front-gray/60">{t("unavailable")}</p>
    );
  }

  return <CommentListContent comments={result} />;
}
