import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/trpc/api/utils/tools";
import { getAllImageLinkFormHtml } from "@/packages/trpc/api/utils/getAllImageLinkFormHtml";
import { PageListQueryInput } from "./schemas/page.list.query.schema";

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

  if (!uniqueUrls.length) return new Map<string, typeof schema.media.$inferSelect>();

  const medias = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.url, uniqueUrls));

  return new Map(medias.map((m) => [m.url, m]));
}

export async function mapPagesWithRelations(
  db: Database,
  pages: PageRow[],
): Promise<PageWithRelations[]> {
  if (!pages.length) return [];

  const [relationRows, imageMap] = await Promise.all([
    db.query.page.findMany({
      where: inArray(schema.page.id, pages.map((p) => p.id)),
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
      .filter((img): img is typeof schema.media.$inferSelect => Boolean(img));

    return {
      ...page,
      author: relationMap.get(page.id)?.author ?? null,
      imagesInContent,
    };
  });
}

export async function getPageList(db: Database, input: PageListQueryInput) {
  const {
    page = 1,
    limit = 10,
    sortField,
    sortOrder,
    title,
    content,
    ...rest
  } = input;

  const where = buildDrizzleWhere(
    schema.page,
    { ...rest, title, content },
    ["status"],
    { title, content },
  );
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

export async function getPageDetail(db: Database, id: string) {
  const page = await db.query.page.findFirst({
    where: eq(schema.page.id, id),
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
