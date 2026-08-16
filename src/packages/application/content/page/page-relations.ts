import "server-only";

import { inArray } from "drizzle-orm";
import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { getAllImageLinkFormHtml } from "@/packages/infrastructure/content/parser/get-all-image-link-form-html";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";

type PageRow = typeof schema.page.$inferSelect;
export type PageWithRelations = PageRow & {
  author: { id: string; name: string | null } | null;
  imagesInContent: (typeof schema.media.$inferSelect)[];
};

async function loadImages(db: Database, pages: PageRow[]) {
  const urls = Array.from(
    new Set(pages.flatMap((page) => getAllImageLinkFormHtml(page.content?.zh))),
  );
  if (!urls.length) return new Map<string, typeof schema.media.$inferSelect>();
  const medias = await observeDbOperation("page.service.images", "select", () =>
    db.select().from(schema.media).where(inArray(schema.media.url, urls)),
  );
  return new Map(medias.map((media) => [media.url, media]));
}

/** 加载页面作者和正文图片关联。 */
export async function mapPagesWithRelations(
  db: Database,
  pages: PageRow[],
): Promise<PageWithRelations[]> {
  if (!pages.length) return [];
  const [rows, imageMap] = await Promise.all([
    observeDbOperation("page.service.relations", "select", () =>
      db.query.page.findMany({
        where: inArray(
          schema.page.id,
          pages.map((page) => page.id),
        ),
        with: { author: { columns: { id: true, name: true } } },
      }),
    ),
    loadImages(db, pages),
  ]);
  const map = new Map(rows.map((row) => [row.id, row]));
  return pages.map((page) => ({
    ...page,
    author: map.get(page.id)?.author ?? null,
    imagesInContent: getAllImageLinkFormHtml(page.content?.zh)
      .map((url) => imageMap.get(url))
      .filter((image): image is typeof schema.media.$inferSelect =>
        Boolean(image),
      ),
  }));
}
