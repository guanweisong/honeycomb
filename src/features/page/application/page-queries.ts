import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { getAllImageLinkFormHtml } from "@/packages/infrastructure/content/parser/get-all-image-link-form-html";
import { PageStatus } from "@/packages/domain/content/page";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type { QueryRecord } from "@/packages/infrastructure/db/query/tools";
import { mapPagesWithRelations } from "./page-relations";
type Visibility = "PUBLISHED_ONLY" | "ALL";
type PageInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
  title?: string;
  content?: string;
} & QueryRecord;
/** 查询页面列表。 */
export async function getPageList(
  db: Database,
  input: PageInput,
  visibility: Visibility = "PUBLISHED_ONLY",
) {
  const {
    page = 1,
    limit = 10,
    sortField,
    sortOrder,
    title,
    content,
    ...rest
  } = input;
  let where = buildDrizzleWhere(
    schema.page,
    { ...rest, title, content },
    ["status"],
    { title, content },
  );
  if (visibility === "PUBLISHED_ONLY") {
    const published = eq(schema.page.status, PageStatus.PUBLISHED);
    where = where ? and(where, published) : published;
  }
  const order = buildDrizzleOrderBy(
    schema.page,
    sortField,
    sortOrder as "asc" | "desc",
    "createdAt",
  );
  const [list, countRows] = await Promise.all([
    observeDbOperation("page.service.list", "select", () =>
      db
        .select()
        .from(schema.page)
        .where(where)
        .orderBy(order)
        .limit(limit)
        .offset((page - 1) * limit),
    ),
    observeDbOperation("page.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.page)
        .where(where),
    ),
  ]);
  return {
    list: await mapPagesWithRelations(db, list),
    total: Number(countRows[0]?.count) || 0,
  };
}
/** 查询页面详情。 */
export async function getPageDetail(
  db: Database,
  id: string,
  visibility: Visibility = "PUBLISHED_ONLY",
) {
  const idFilter = eq(schema.page.id, id);
  const page = await observeDbOperation("page.service.detail", "select", () =>
    db.query.page.findFirst({
      where:
        visibility === "ALL"
          ? idFilter
          : and(idFilter, eq(schema.page.status, PageStatus.PUBLISHED)),
      with: { author: { columns: { id: true, name: true } } },
    }),
  );
  if (!page) return null;
  const urls = getAllImageLinkFormHtml(page.content?.zh);
  const imagesInContent = urls.length
    ? await observeDbOperation("page.service.detail-images", "select", () =>
        db.select().from(schema.media).where(inArray(schema.media.url, urls)),
      )
    : [];
  return { ...page, author: page.author ?? null, imagesInContent };
}
/** 查询页面作者。 */
export async function getPageAuthorById(db: Database, authorId: string) {
  const [author] = await observeDbOperation(
    "page.service.author",
    "select",
    () =>
      db
        .select({ id: schema.user.id, name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, authorId)),
  );
  return author ?? null;
}
