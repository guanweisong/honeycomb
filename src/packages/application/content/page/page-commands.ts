import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PageStatus } from "@/packages/domain/content/page";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { sanitizeRichText } from "@/packages/infrastructure/security/sanitize-html";

type PageCommandInput = {
  title?: unknown;
  content?: unknown;
  status?: string;
  template?: string;
};

function sanitizeContent(value: unknown) {
  const content = value as { en?: string; zh?: string };
  return {
    en: sanitizeRichText(content.en),
    zh: sanitizeRichText(content.zh),
  };
}

/** 创建独立页面并清洗富文本内容。 */
export async function createPage(
  db: Database,
  input: PageCommandInput,
  authorId: string,
) {
  const [page] = await observeDbOperation("page.create", "insert", () =>
    db
      .insert(schema.page)
      .values({
        ...input,
        content: sanitizeContent(input.content),
        authorId,
      } as typeof schema.page.$inferInsert)
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
export async function updatePage(
  db: Database,
  input: PageCommandInput & { id: string },
) {
  const { id, ...rest } = input;
  const nextValues = {
    ...rest,
    ...(rest.content ? { content: sanitizeContent(rest.content) } : {}),
  };
  const [page] = await observeDbOperation("page.update", "update", () =>
    db
      .update(schema.page)
      .set(nextValues as typeof schema.page.$inferInsert)
      .where(eq(schema.page.id, id))
      .returning(),
  );
  return page;
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
