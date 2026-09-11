import "server-only";
import { repositoryPaginationDefaults } from "@/packages/application/pagination";
import { parseEnumValue } from "@/packages/infrastructure/db/value-validation";
import { PageTemplate } from "@/packages/domain/content/page-template";

import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import {
  buildDrizzleOrderBy,
  buildDrizzleWhere,
} from "@/packages/infrastructure/db/query/tools";
import { getLocalizedImageLinks } from "@/packages/infrastructure/content/parser/get-all-image-link-form-html";
import { PageStatus } from "@/packages/domain/content/page";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import type {
  PageQueryRepository,
  PageWithRelations,
} from "../application/repository";
import { groupPageTranslations } from "./page-translations";

type PageRow = typeof schema.page.$inferSelect;
type PageTranslations = ReturnType<typeof groupPageTranslations> extends Map<
  string,
  infer Value
>
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
): Promise<PageWithRelations[]> {
  if (!pages.length) return [];
  const urls = new Set<string>();
  const rows = await observeDbOperation("page.service.relations", "select", () =>
      db.query.page.findMany({
        where: inArray(
          schema.page.id,
          pages.map((page) => page.id),
        ),
        with: {
          author: { columns: { id: true, name: true } },
          translations: true,
        },
      }),
    );
  const translations = groupPageTranslations(rows.flatMap((row) => row.translations));
  const localizedPages = pages.map((page) => ({
    ...toPageRecord(page, translations.get(page.id)),
    author: rows.find((row) => row.id === page.id)?.author ?? null,
  }));
  for (const page of localizedPages) {
    for (const url of getLocalizedImageLinks(page.content)) urls.add(url);
  }
  const urlList = [...urls];
  const medias = urlList.length
      ? await observeDbOperation("page.service.images", "select", () =>
          db.select().from(schema.media).where(inArray(schema.media.url, urlList)),
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

export function createPageQueryRepository(db: Database): PageQueryRepository {
  return {
    async list(input, visibility) {
      const {
        page = repositoryPaginationDefaults.page,
        limit = repositoryPaginationDefaults.limit,
        sortField,
        sortOrder,
        title,
        content,
        ...rest
      } = input;
      let where = buildDrizzleWhere(
        schema.page,
        rest,
        ["status"],
      );
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
        list: await mapRelations(db, list),
        total: Number(countRows[0]?.count) || 0,
      };
    },
    async detail(id, visibility) {
      const idFilter = eq(schema.page.id, id);
      const page = await observeDbOperation(
        "page.service.detail",
        "select",
        () =>
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
            db
              .select()
              .from(schema.media)
              .where(inArray(schema.media.url, urls)),
          )
        : [];
      return {
        ...localized,
        author: page.author ?? null,
        imagesInContent: [
          ...new Map(
            imagesInContent.map((image) => [image.url, image]),
          ).values(),
        ],
      };
    },
    async author(id) {
      const [author] = await observeDbOperation(
        "page.service.author",
        "select",
        () =>
          db
            .select({ id: schema.user.id, name: schema.user.name })
            .from(schema.user)
            .where(eq(schema.user.id, id)),
      );
      return author ?? null;
    },
  };
}
