import { getTranslations } from "next-intl/server";
import { unstable_rethrow } from "next/navigation";
import { getPublicComments } from "@/app/lib/server/public-queries";
import CommentClient from "@/app/(blog)/components/features/comment/public/components/CommentClient";
import type { MenuType } from "@/features/menu/types/menu.type";
import type { MultiLangEnum } from "@/lib/i18n/i18n";

export async function loadOptionalPublicComments(id: string, type: MenuType) {
  try {
    return await getPublicComments(id, type);
  } catch (error) {
    unstable_rethrow(error);
    // A comment failure or a concurrent disable must not replace public content.
    return null;
  }
}

export async function PublicCommentSection({
  id,
  type,
  locale,
  comments,
}: {
  id: string;
  type: MenuType;
  locale: MultiLangEnum;
  comments: ReturnType<typeof loadOptionalPublicComments>;
}) {
  const result = await comments;
  if (!result) {
    const t = await getTranslations({ locale, namespace: "Comment" });
    return (
      <p className="my-3 text-sm text-auto-front-gray/60">{t("unavailable")}</p>
    );
  }

  return <CommentClient id={id} type={type} comments={result} />;
}
