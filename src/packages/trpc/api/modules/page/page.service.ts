import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import { getAllImageLinkFormHtml } from "@/packages/trpc/api/utils/get-all-image-link-form-html";
import { PageListQueryInput } from "./schemas/page.list.query.schema";
import { PageStatus } from "@/packages/domain/content/page";
import { ContentVisibility } from "@/packages/trpc/api/types/content-visibility";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { sanitizeRichText } from "@/packages/trpc/api/utils/sanitize-html";
import type { PageInsert } from "./schemas/page.insert.schema";
import type { PageUpdate } from "./schemas/page.update.schema";

type AuthorRef = {
  id: string;
  name: string | null;
};

type PageRow = typeof schema.page.$inferSelect;

export type PageWithRelations = PageRow & {
  author: AuthorRef | null;
  imagesInContent: (typeof schema.media.$inferSelect)[];
};

async function loadPageImages(db: Database, pages: PageRow[]) {
  const uniqueUrls = Array.from(
    new Set(
      pages.flatMap((page) => getAllImageLinkFormHtml(page?.content?.zh)),
    ),
  );

  if (!uniqueUrls.length) {
    return new Map<string, typeof schema.media.$inferSelect>();
  }

  const medias = await observeDbOperation("page.service.images", "select", () =>
    db.select().from(schema.media).where(inArray(schema.media.url, uniqueUrls)),
  );

  return new Map(medias.map((media) => [media.url, media]));
}

export async function mapPagesWithRelations(
  db: Database,
  pages: PageRow[],
): Promise<PageWithRelations[]> {
  if (!pages.length) return [];

  const [relationRows, imageMap] = await Promise.all([
    observeDbOperation("page.service.relations", "select", () =>
      db.query.page.findMany({
        where: inArray(
          schema.page.id,
          pages.map((page) => page.id),
        ),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ),
    loadPageImages(db, pages),
  ]);

  const relationMap = new Map(relationRows.map((row) => [row.id, row]));

  return pages.map((page) => {
    const imageUrls = getAllImageLinkFormHtml(page?.content?.zh);
    const imagesInContent = imageUrls
      .map((url) => imageMap.get(url))
      .filter((image): image is typeof schema.media.$inferSelect =>
        Boolean(image),
      );

    return {
      ...page,
      author: relationMap.get(page.id)?.author ?? null,
      imagesInContent,
    };
  });
}

export async function getPageList(
  db: Database,
  input: PageListQueryInput,
  visibility = ContentVisibility.PUBLISHED_ONLY,
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
  if (visibility === ContentVisibility.PUBLISHED_ONLY) {
    const published = eq(schema.page.status, PageStatus.PUBLISHED);
    where = where ? and(where, published) : published;
  }

  const orderByClause = buildDrizzleOrderBy(
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
        .orderBy(orderByClause)
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

  const mapped = await mapPagesWithRelations(db, list);
  const [countResult] = countRows;
  const total = Number(countResult?.count) || 0;

  return { list: mapped, total };
}

export async function getPageDetail(
  db: Database,
  id: string,
  visibility = ContentVisibility.PUBLISHED_ONLY,
) {
  const idFilter = eq(schema.page.id, id);
  const page = await observeDbOperation("page.service.detail", "select", () =>
    db.query.page.findFirst({
      where:
        visibility === ContentVisibility.ALL
          ? idFilter
          : and(idFilter, eq(schema.page.status, PageStatus.PUBLISHED)),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    }),
  );
  if (!page) return null;

  const imageUrls = getAllImageLinkFormHtml(page?.content?.zh);
  const imagesInContent = imageUrls.length
    ? await observeDbOperation("page.service.detail-images", "select", () =>
        db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.url, imageUrls)),
      )
    : [];

  return {
    ...page,
    author: page.author ?? null,
    imagesInContent,
  };
}

export async function getPageAuthorById(db: Database, authorId: string) {
  const [author] = await observeDbOperation(
    "page.service.author",
    "select",
    () =>
      db
        .select({
          id: schema.user.id,
          name: schema.user.name,
        })
        .from(schema.user)
        .where(eq(schema.user.id, authorId)),
  );
  return author ?? null;
}

/** 创建独立页面并清洗富文本内容。 */
export async function createPage(
  db: Database,
  input: PageInsert,
  authorId: string,
) {
  const [page] = await observeDbOperation("page.create", "insert", () =>
    db
      .insert(schema.page)
      .values({
        ...input,
        content: {
          en: sanitizeRichText(input.content.en),
          zh: sanitizeRichText(input.content.zh),
        },
        authorId,
      })
      .returning(),
  );
  return page;
}

/** 批量删除独立页面。 */
export async function destroyPages(db: Database, ids: string[]) {
  await observeDbOperation("page.destroy", "delete", () =>
    db.delete(schema.page).where(inArray(schema.page.id, ids)),
  );
  return { success: true as const };
}

/** 更新独立页面并返回作者关联。 */
export async function updatePage(db: Database, input: PageUpdate) {
  const { id, ...rest } = input;
  const nextValues = {
    ...rest,
    ...(rest.content
      ? {
          content: {
            en: sanitizeRichText(rest.content.en),
            zh: sanitizeRichText(rest.content.zh),
          },
        }
      : {}),
  };
  const [page] = await observeDbOperation("page.update", "update", () =>
    db
      .update(schema.page)
      .set(nextValues)
      .where(eq(schema.page.id, id))
      .returning(),
  );
  const author = page.authorId
    ? await getPageAuthorById(db, page.authorId)
    : null;
  return { ...page, author };
}

/** 增加公开页面浏览量。 */
export async function incrementPageViews(db: Database, id: string) {
  const [page] = await observeDbOperation(
    "page.increment-views",
    "update",
    () =>
      db
        .update(schema.page)
        .set({ views: sql`${schema.page.views} + 1` })
        .where(
          and(
            eq(schema.page.id, id),
            eq(schema.page.status, PageStatus.PUBLISHED),
          ),
        )
        .returning({ views: schema.page.views }),
  );
  return page;
}
