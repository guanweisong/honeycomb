import "server-only";
import { readMediaByUrls } from "@/features/media/server/read-media-by-urls";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { parseEnumValue } from "@/lib/db/value-validation";
import { PageTemplate } from "@/features/page/types/page.template";
import { MediaRecordSchema } from "@/features/media/schemas/media.record.schema";

import { and, asc, desc, eq, getTableName, sql, type SQL } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/lib/db/query/query-builders";
import { getLocalizedImageLinks } from "@/lib/content/image-links";
import { PageStatus } from "@/features/page/types/page.status";
import { observeDbOperation } from "@/lib/observability/server";
import type { PageWithRelations } from "@/features/page/types/page.read-model";
import type {
  PageInput,
  PageVisibility,
} from "@/features/page/types/page.list-query";
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
import type {
  PageListItem,
  PageMenuOption,
} from "@/features/page/types/page.read-model";
import {
  groupPageTranslations,
  type PageTranslationRow,
} from "@/features/page/server/page-translations";

type PageRow = typeof schema.page.$inferSelect;
const pageRelations = {
  author: { columns: { id: true, name: true } },
  translations: true,
} as const;
type PageTranslations =
  ReturnType<typeof groupPageTranslations> extends Map<string, infer Value>
    ? Value
    : never;

/** 显式白名单投影，避免创建令牌与原始意图哈希经详情或列表泄漏。 */
function toPageRecord(
  page: PageRow,
  translations: PageTranslations | undefined,
) {
  return {
    id: page.id,
    version: page.version,
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
  rows: (PageRow & {
    author: PageWithRelations["author"];
    translations: PageTranslationRow[];
  })[],
): Promise<PageWithRelations[]> {
  const localizedPages = rows.map((row) => {
    const page = toPageRecord(
      row,
      groupPageTranslations(row.translations).get(row.id),
    );
    return {
      page: { ...page, author: row.author ?? null },
      urls: getLocalizedImageLinks(page.content),
    };
  });
  const urlList = [...new Set(localizedPages.flatMap(({ urls }) => urls))];
  const medias = await readMediaByUrls(db, urlList, "page.service.images");
  const imageMap = new Map(medias.map((media) => [media.url, media]));
  return localizedPages.map(({ page, urls }) => ({
    ...page,
    imagesInContent: urls
      .map((url) => imageMap.get(url))
      .filter((image): image is typeof schema.media.$inferSelect =>
        Boolean(image),
      )
      .map((image) => MediaRecordSchema.parse(image)),
  }));
}

function pageListQuery(input: PageInput, visibility: PageVisibility) {
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
    // RQB aliases Column nodes recursively. Keep inner translation identifiers
    // explicit so only the correlated outer page ID receives its page alias.
    const translationTable = sql.identifier(
      getTableName(schema.pageTranslation),
    );
    const match = sql`exists (
      select 1 from ${schema.pageTranslation}
      where ${translationTable}.${sql.identifier(schema.pageTranslation.pageId.name)} = ${schema.page.id}
        and ${translationTable}.${sql.identifier(column.name)} like ${`%${value}%`}
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
  return { page, limit, where, order };
}

async function countPages(db: Database, where: SQL | undefined) {
  const rows = await observeDbOperation("page.service.count", "select", () =>
    db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(schema.page)
      .where(where),
  );
  return Number(rows[0]?.count) || 0;
}

export async function listPages(
  db: Database,
  input: PageInput,
  visibility: PageVisibility,
) {
  const { page, limit, where, order } = pageListQuery(input, visibility);
  const [rows, total] = await Promise.all([
    observeDbOperation("page.service.list", "select", () =>
      db.query.page.findMany({
        where,
        orderBy: order,
        limit,
        offset: (page - 1) * limit,
        with: pageRelations,
      }),
    ),
    countPages(db, where),
  ]);
  return { list: await mapRelations(db, rows), total };
}

/** 后台表格只读取标题和行操作所需字段，不装配正文或媒体。 */
export async function listPageSummaries(
  db: Database,
  input: PageInput,
  visibility: PageVisibility,
): Promise<{ list: PageListItem[]; total: number }> {
  const { page, limit, where, order } = pageListQuery(input, visibility);
  const [rows, total] = await Promise.all([
    observeDbOperation("page.service.list", "select", () =>
      db.query.page.findMany({
        columns: {
          id: true,
          version: true,
          views: true,
          status: true,
          template: true,
          createdAt: true,
          updatedAt: true,
        },
        where,
        orderBy: order,
        limit,
        offset: (page - 1) * limit,
        with: {
          author: { columns: { id: true, name: true } },
          translations: { columns: { locale: true, title: true } },
        },
      }),
    ),
    countPages(db, where),
  ]);
  return {
    list: rows.map((row) => ({
      id: row.id,
      version: row.version,
      views: row.views,
      status: parseEnumValue(
        row.status,
        Object.values(PageStatus),
        "page.status",
      ),
      template: parseEnumValue(
        row.template,
        Object.values(PageTemplate),
        "page.template",
      ),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      title: assembleRequiredLocalizedField(
        row.translations,
        (translation) => translation.title,
      ),
      author: row.author ?? null,
    })),
    total,
  };
}

/** 菜单选项保留双语标题与编辑器所需时间，不读取作者或正文。 */
export async function listPageMenuOptions(
  db: Database,
  input: PageInput,
  visibility: PageVisibility,
): Promise<{ list: PageMenuOption[]; total: number }> {
  const { page, limit, where, order } = pageListQuery(input, visibility);
  const [rows, total] = await Promise.all([
    observeDbOperation("page.service.list", "select", () =>
      db.query.page.findMany({
        columns: { id: true, createdAt: true, updatedAt: true },
        where,
        orderBy: order,
        limit,
        offset: (page - 1) * limit,
        with: { translations: { columns: { locale: true, title: true } } },
      }),
    ),
    countPages(db, where),
  ]);
  return {
    list: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      title: assembleRequiredLocalizedField(
        row.translations,
        (translation) => translation.title,
      ),
    })),
    total,
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
      with: pageRelations,
    }),
  );
  if (!page) return null;
  const translations = groupPageTranslations(page.translations);
  const localized = toPageRecord(page, translations.get(page.id));
  const urls = getLocalizedImageLinks(localized.content);
  const imagesInContent = await readMediaByUrls(
    db,
    urls,
    "page.service.detail-images",
  );
  return {
    ...localized,
    author: page.author ?? null,
    imagesInContent: [
      ...new Map(imagesInContent.map((image) => [image.url, image])).values(),
    ].map((image) => MediaRecordSchema.parse(image)),
  };
}

/** Sitemap owns a published-only projection; no body, author or media hydration. */
export async function listPublishedPageSitemapEntries(
  db: Database,
  page: number,
  limit: number,
) {
  return observeDbOperation("page.service.list", "select", () =>
    db
      .select({ id: schema.page.id, updatedAt: schema.page.updatedAt })
      .from(schema.page)
      .where(eq(schema.page.status, PageStatus.PUBLISHED))
      .orderBy(desc(schema.page.updatedAt), asc(schema.page.id))
      .limit(limit)
      .offset((page - 1) * limit),
  );
}

export function countPublishedPages(db: Database) {
  return countPages(db, eq(schema.page.status, PageStatus.PUBLISHED));
}
