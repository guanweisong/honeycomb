import "server-only";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import { repositoryPaginationDefaults } from "@/lib/validation/pagination";
import { parseEnumValue } from "@/lib/db/value-validation";
import { PageTemplate } from "@/features/page/page-template";
import { MediaRecordSchema } from "@/features/media/schema";

import { and, eq, getTableName, inArray, sql } from "drizzle-orm";
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
import { assembleRequiredLocalizedField } from "@/lib/db/translation-values";
import type { PageListItem, PageMenuOption } from "../types";
import { groupPageTranslations } from "./page-translations";

type PageRow = typeof schema.page.$inferSelect;
type PageTranslations =
  ReturnType<typeof groupPageTranslations> extends Map<string, infer Value>
    ? Value
    : never;

/** 显式白名单投影，避免创建令牌与原始意图哈希经详情或列表泄漏。 */
function toPageRecord(
  page: PageRow & { translations?: unknown; author?: unknown },
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

async function readPageImages(
  db: Database,
  urls: string[],
  operation: "page.service.images" | "page.service.detail-images",
) {
  const images: (typeof schema.media.$inferSelect)[] = [];
  for (let offset = 0; offset < urls.length; offset += SQL_ID_CHUNK_SIZE) {
    images.push(
      ...(await observeDbOperation(operation, "select", () =>
        db
          .select()
          .from(schema.media)
          .where(
            inArray(
              schema.media.url,
              urls.slice(offset, offset + SQL_ID_CHUNK_SIZE),
            ),
          ),
      )),
    );
  }
  return images;
}

async function mapRelations(
  db: Database,
  pages: Pick<PageRow, "id">[],
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
  const visiblePages = pages.flatMap((page) => {
    const row = relationMap.get(page.id);
    return row ? [row] : [];
  });
  const localizedPages = visiblePages.map((page) => ({
    ...toPageRecord(page, translations.get(page.id)),
    author: relationMap.get(page.id)?.author ?? null,
  }));
  for (const page of localizedPages) {
    for (const url of getLocalizedImageLinks(page.content)) urls.add(url);
  }
  const urlList = [...urls];
  const medias = await readPageImages(db, urlList, "page.service.images");
  const imageMap = new Map(medias.map((media) => [media.url, media]));
  return localizedPages.map((page) => ({
    ...page,
    imagesInContent: getLocalizedImageLinks(page.content)
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

export async function listPages(
  db: Database,
  input: PageInput,
  visibility: PageVisibility,
) {
  const { page, limit, where, order } = pageListQuery(input, visibility);
  const [list, countRows] = await Promise.all([
    observeDbOperation("page.service.list", "select", () =>
      db
        .select({ id: schema.page.id })
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

/** 后台表格只读取标题和行操作所需字段，不装配正文或媒体。 */
export async function listPageSummaries(
  db: Database,
  input: PageInput,
  visibility: PageVisibility,
): Promise<{ list: PageListItem[]; total: number }> {
  const { page, limit, where, order } = pageListQuery(input, visibility);
  const [rows, counts] = await Promise.all([
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
    observeDbOperation("page.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.page)
        .where(where),
    ),
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
    total: Number(counts[0]?.count) || 0,
  };
}

/** 菜单选项保留双语标题与编辑器所需时间，不读取作者或正文。 */
export async function listPageMenuOptions(
  db: Database,
  input: PageInput,
  visibility: PageVisibility,
): Promise<{ list: PageMenuOption[]; total: number }> {
  const { page, limit, where, order } = pageListQuery(input, visibility);
  const [rows, counts] = await Promise.all([
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
    observeDbOperation("page.service.count", "select", () =>
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(schema.page)
        .where(where),
    ),
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
    total: Number(counts[0]?.count) || 0,
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
  const imagesInContent = await readPageImages(
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
