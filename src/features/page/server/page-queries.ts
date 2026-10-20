import "server-only";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { parseEnumValue } from "@/lib/db/value-validation";
import { PageTemplate } from "@/features/page/page-template";

import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { getLocalizedImageLinks } from "@/lib/content/image-links";
import { PageStatus } from "@/features/page/page-status";
import { observeDbOperation } from "@/lib/observability/server";
import type { PageWithRelations, PageInput, PageVisibility } from "../types";
import { groupPageTranslations } from "./page-translations";

type PageRow = typeof schema.page.$inferSelect;
type PageTranslations =
  ReturnType<typeof groupPageTranslations> extends Map<string, infer Value>
    ? Value
    : never;

function toPageRecord(
  page: PageRow & { translations?: unknown; author?: unknown },
  translations: PageTranslations | undefined,
) {
  return {
    id: page.id,
    authorId: page.authorId,
    views: page.views,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    title: translations?.title ?? null,
    content: translations?.content ?? null,
    status: parseEnumValue(
      page.status,
      Object.values(PageStatus),
      "page.status",
    ),
    template: parseEnumValue(
      page.template,
      Object.values(PageTemplate),
      "page.template",
    ),
  };
}

async function mapRelations(
  db: Database,
  pages: PageRow[],
  visibility: PageVisibility,
): Promise<PageWithRelations[]> {
  if (!pages.length) return [];
  const urls = new Set<string>();
  // 关联读取重新约束公开状态；两次查询之间撤回的页面不能继续带出正文或关联数据。
  const rows = await observeDbOperation(
    "page.service.relations",
    "select",
    () =>
      db.query.page.findMany({
        where: and(
          inArray(
            schema.page.id,
            pages.map((page) => page.id),
          ),
          visibility === "PUBLISHED_ONLY"
            ? eq(schema.page.status, PageStatus.PUBLISHED)
            : undefined,
        ),
        with: {
          author: { columns: { id: true, name: true } },
          translations: true,
        },
      }),
  );
  const translations = groupPageTranslations(
    rows.flatMap((row) => row.translations),
  );
  const relationMap = new Map(rows.map((row) => [row.id, row]));
  const visiblePages =
    visibility === "PUBLISHED_ONLY"
      ? pages.flatMap((page) => {
          const row = relationMap.get(page.id);
          return row ? [row] : [];
        })
      : pages;
  const localizedPages = visiblePages.map((page) => ({
    ...toPageRecord(page, translations.get(page.id)),
    author: relationMap.get(page.id)?.author ?? null,
  }));
  for (const page of localizedPages) {
    for (const url of getLocalizedImageLinks(page.content)) urls.add(url);
  }
  const urlList = [...urls];
  const medias = urlList.length
    ? await observeDbOperation("page.service.images", "select", () =>
        db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.url, urlList)),
      )
    : [];
  const imageMap = new Map(medias.map((media) => [media.url, media]));
  return localizedPages.map((page) => ({
    ...page,
    imagesInContent: getLocalizedImageLinks(page.content)
      .map((url) => imageMap.get(url))
      .filter((image): image is typeof schema.media.$inferSelect =>
        Boolean(image),
      ),
  }));
}

export async function listPages(
  db: Database,
  input: PageInput,
  visibility: PageVisibility,
) {
  const {
    page = repositoryPaginationDefaults.page,
    limit = repositoryPaginationDefaults.limit,
    sortField,
    sortOrder,
    title,
    content,
    ...rest
  } = input;
  let where = buildDrizzleWhere(schema.page, rest, ["status"]);
  for (const [column, value] of [
    [schema.pageTranslation.title, title],
    [schema.pageTranslation.content, content],
  ] as const) {
    if (!value) continue;
    const match = sql`exists (
      select 1 from ${schema.pageTranslation}
      where ${schema.pageTranslation.pageId} = ${schema.page.id}
        and ${column} like ${`%${value}%`}
    )`;
    where = where ? and(where, match) : match;
  }
  if (visibility === "PUBLISHED_ONLY") {
    const published = eq(schema.page.status, PageStatus.PUBLISHED);
    where = where ? and(where, published) : published;
  }
  const order = buildDrizzleOrderBy(
    schema.page,
    sortField,
    sortOrder,
    repositoryPaginationDefaults.sortField,
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
    list: await mapRelations(db, list, visibility),
    total: Number(countRows[0]?.count) || 0,
  };
}

export async function getPage(
  db: Database,
  id: string,
  visibility: PageVisibility,
) {
  const idFilter = eq(schema.page.id, id);
  const page = await observeDbOperation("page.service.detail", "select", () =>
    db.query.page.findFirst({
      where:
        visibility === "ALL"
          ? idFilter
          : and(idFilter, eq(schema.page.status, PageStatus.PUBLISHED)),
      with: {
        author: { columns: { id: true, name: true } },
        translations: true,
      },
    }),
  );
  if (!page) return null;
  const translations = groupPageTranslations(page.translations);
  const localized = toPageRecord(page, translations.get(page.id));
  const urls = getLocalizedImageLinks(localized.content);
  const imagesInContent = urls.length
    ? await observeDbOperation("page.service.detail-images", "select", () =>
        db.select().from(schema.media).where(inArray(schema.media.url, urls)),
      )
    : [];
  return {
    ...localized,
    author: page.author ?? null,
    imagesInContent: [
      ...new Map(imagesInContent.map((image) => [image.url, image])).values(),
    ],
  };
}
