import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PostStatus } from "@/packages/domain/content/post-status";
import { getAllImageLinkFormHtml } from "@/packages/infrastructure/content/parser/get-all-image-link-form-html";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { loadPostRelations } from "./post-relations";

type ContentVisibility = "PUBLISHED_ONLY" | "ALL";
const ContentVisibility = {
  PUBLISHED_ONLY: "PUBLISHED_ONLY",
  ALL: "ALL",
} as const;

/** 查询文章详情及关联的正文图片。 */
export async function getPostDetail(
  db: Database,
  id: string,
  visibility: ContentVisibility = ContentVisibility.PUBLISHED_ONLY,
) {
  const idFilter = eq(schema.post.id, id);
  const [item] = await observeDbOperation("post.service.detail", "select", () =>
    db
      .select()
      .from(schema.post)
      .where(
        visibility === ContentVisibility.ALL
          ? idFilter
          : and(idFilter, eq(schema.post.status, PostStatus.PUBLISHED)),
      )
      .limit(1),
  );
  if (!item) return null;
  const [result] = await loadPostRelations(db, [item]);
  const imageUrls = getAllImageLinkFormHtml(result?.content?.zh);
  const imagesInContent = imageUrls.length
    ? await observeDbOperation("post.service.detail-images", "select", () =>
        db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.url, imageUrls)),
      )
    : [];
  return { ...result, imagesInContent };
}
