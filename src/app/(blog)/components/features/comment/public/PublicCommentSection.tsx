import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { createServerClient } from "@/app/trpc/server";
import CommentClient from "@/app/(blog)/components/features/comment/public/components/CommentClient";
import type { MenuType } from "@/features/menu/types/menu.type";
import type { MultiLangEnum } from "@/lib/i18n/i18n";

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

  return <CommentClient id={id} type={type} comments={result} />;
}
