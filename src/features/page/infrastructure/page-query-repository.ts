import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { buildDrizzleOrderBy, buildDrizzleWhere, type QueryRecord } from "@/packages/infrastructure/db/query/tools";
import { getAllImageLinkFormHtml } from "@/packages/infrastructure/content/parser/get-all-image-link-form-html";
import { PageStatus } from "@/packages/domain/content/page";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

export type PageVisibility = "PUBLISHED_ONLY" | "ALL";
export type PageInput = { page?: number; limit?: number; sortField?: string; sortOrder?: string; title?: string; content?: string } & QueryRecord;
export type PageRow = typeof schema.page.$inferSelect;
export type PageWithRelations = PageRow & { author: { id: string; name: string | null } | null; imagesInContent: (typeof schema.media.$inferSelect)[] };
export interface PageQueryRepository {
  list(input: PageInput, visibility: PageVisibility): Promise<{ list: PageWithRelations[]; total: number }>;
  detail(id: string, visibility: PageVisibility): Promise<(PageWithRelations & { author: { id: string; name: string | null } | null }) | null>;
  author(id: string): Promise<{ id: string; name: string | null } | null>;
}

async function mapRelations(db: Database, pages: PageRow[]): Promise<PageWithRelations[]> {
  if (!pages.length) return [];
  const urls = Array.from(new Set(pages.flatMap((page) => getAllImageLinkFormHtml(page.content?.zh))));
  const [rows, medias] = await Promise.all([
    observeDbOperation("page.service.relations", "select", () => db.query.page.findMany({ where: inArray(schema.page.id, pages.map((page) => page.id)), with: { author: { columns: { id: true, name: true } } } })),
    urls.length ? observeDbOperation("page.service.images", "select", () => db.select().from(schema.media).where(inArray(schema.media.url, urls))) : Promise.resolve([]),
  ]);
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const imageMap = new Map(medias.map((media) => [media.url, media]));
  return pages.map((page) => ({ ...page, author: rowMap.get(page.id)?.author ?? null, imagesInContent: getAllImageLinkFormHtml(page.content?.zh).map((url) => imageMap.get(url)).filter((image): image is typeof schema.media.$inferSelect => Boolean(image)) }));
}

export function createPageQueryRepository(db: Database): PageQueryRepository {
  return {
    async list(input, visibility) {
      const { page = 1, limit = 10, sortField, sortOrder, title, content, ...rest } = input;
      let where = buildDrizzleWhere(schema.page, { ...rest, title, content }, ["status"], { title, content });
      if (visibility === "PUBLISHED_ONLY") { const published = eq(schema.page.status, PageStatus.PUBLISHED); where = where ? and(where, published) : published; }
      const order = buildDrizzleOrderBy(schema.page, sortField, sortOrder as "asc" | "desc", "createdAt");
      const [list, countRows] = await Promise.all([
        observeDbOperation("page.service.list", "select", () => db.select().from(schema.page).where(where).orderBy(order).limit(limit).offset((page - 1) * limit)),
        observeDbOperation("page.service.count", "select", () => db.select({ count: sql<number>`count(*)`.as("count") }).from(schema.page).where(where)),
      ]);
      return { list: await mapRelations(db, list), total: Number(countRows[0]?.count) || 0 };
    },
    async detail(id, visibility) {
      const idFilter = eq(schema.page.id, id);
      const page = await observeDbOperation("page.service.detail", "select", () => db.query.page.findFirst({ where: visibility === "ALL" ? idFilter : and(idFilter, eq(schema.page.status, PageStatus.PUBLISHED)), with: { author: { columns: { id: true, name: true } } } }));
      if (!page) return null;
      const urls = getAllImageLinkFormHtml(page.content?.zh);
      const imagesInContent = urls.length ? await observeDbOperation("page.service.detail-images", "select", () => db.select().from(schema.media).where(inArray(schema.media.url, urls))) : [];
      return { ...page, author: page.author ?? null, imagesInContent } as PageWithRelations;
    },
    async author(id) {
      const [author] = await observeDbOperation("page.service.author", "select", () => db.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, id)));
      return author ?? null;
    },
  };
}
