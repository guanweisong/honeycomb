import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import { getAllImageLinkFormHtml } from "@/packages/trpc/api/utils/getAllImageLinkFormHtml";
import { PageListQueryInput } from "./schemas/page.list.query.schema";
import { PageStatus } from "./types/page.status";
import { ContentVisibility } from "@/packages/trpc/api/types/content-visibility";

type AuthorRef = {
  id: string;
  name: string | null;
};

type PageRow = typeof schema.page.$inferSelect;

export type PageWithRelations = PageRow & {
  author: AuthorRef | null;
  imagesInContent: typeof schema.media.$inferSelect[];
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

  const medias = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.url, uniqueUrls));

  return new Map(medias.map((media) => [media.url, media]));
}

export async function mapPagesWithRelations(
  db: Database,
  pages: PageRow[],
): Promise<PageWithRelations[]> {
  if (!pages.length) return [];

  const [relationRows, imageMap] = await Promise.all([
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

  const list = await db
    .select()
    .from(schema.page)
    .where(where)
    .orderBy(orderByClause)
    .limit(limit)
    .offset((page - 1) * limit);

  const mapped = await mapPagesWithRelations(db, list);
  const [countResult] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(schema.page)
    .where(where);
  const total = Number(countResult?.count) || 0;

  return { list: mapped, total };
}

export async function getPageDetail(
  db: Database,
  id: string,
  visibility = ContentVisibility.PUBLISHED_ONLY,
) {
  const idFilter = eq(schema.page.id, id);
  const page = await db.query.page.findFirst({
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
  });
  if (!page) return null;

  const imageUrls = getAllImageLinkFormHtml(page?.content?.zh);
  const imagesInContent = imageUrls.length
    ? await db
        .select()
        .from(schema.media)
        .where(inArray(schema.media.url, imageUrls))
    : [];

  return {
    ...page,
    author: page.author ?? null,
    imagesInContent,
  };
}

export async function getPageAuthorById(db: Database, authorId: string) {
  const [author] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
    })
    .from(schema.user)
    .where(eq(schema.user.id, authorId));
  return author ?? null;
}
