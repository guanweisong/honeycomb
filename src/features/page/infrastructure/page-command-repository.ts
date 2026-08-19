import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PageStatus } from "@/packages/domain/content/page";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { sanitizeRichText } from "@/packages/infrastructure/security/sanitize-html";

export type PageCommandInput = { title?: unknown; content?: unknown; status?: string; template?: string };
function sanitizeContent(value: unknown) { const content = value as { en?: string; zh?: string }; return { en: sanitizeRichText(content.en), zh: sanitizeRichText(content.zh) }; }
export interface PageCommandRepository {
  create(input: PageCommandInput, authorId: string): Promise<typeof schema.page.$inferSelect>;
  destroy(ids: string[]): Promise<{ success: true }>;
  update(input: PageCommandInput & { id: string }): Promise<typeof schema.page.$inferSelect>;
  incrementViews(id: string): Promise<{ views: number } | undefined>;
}
export function createPageCommandRepository(db: Database): PageCommandRepository {
  return {
    async create(input, authorId) { const [page] = await observeDbOperation("page.create", "insert", () => db.insert(schema.page).values({ ...input, content: sanitizeContent(input.content), authorId } as typeof schema.page.$inferInsert).returning()); return page; },
    async destroy(ids) { await observeDbOperation("page.destroy", "delete", () => db.delete(schema.page).where(inArray(schema.page.id, ids))); return { success: true } as const; },
    async update(input) { const { id, ...rest } = input; const nextValues = { ...rest, ...(rest.content ? { content: sanitizeContent(rest.content) } : {}) }; const [page] = await observeDbOperation("page.update", "update", () => db.update(schema.page).set(nextValues as typeof schema.page.$inferInsert).where(eq(schema.page.id, id)).returning()); return page; },
    async incrementViews(id) { const [page] = await observeDbOperation("page.increment-views", "update", () => db.update(schema.page).set({ views: sql`${schema.page.views} + 1` }).where(and(eq(schema.page.id, id), eq(schema.page.status, PageStatus.PUBLISHED))).returning({ views: schema.page.views })); return page; },
  };
}
