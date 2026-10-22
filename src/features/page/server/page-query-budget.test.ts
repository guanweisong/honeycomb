import { expect, it, vi } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { getPage } from "./page-queries";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
it("bounds all unique media URL reads without losing bilingual content or querying empty images", async () => {
  const db = createMockDb();
  const content = Array.from(
    { length: 1101 },
    (_, index) => `<img src="https://cdn.test/${index}.png">`,
  ).join("");
  db.query.page.findFirst.mockResolvedValue({
    id: "page",
    version: 1,
    authorId: "author",
    views: 0,
    status: PageStatus.PUBLISHED,
    template: PageTemplate.DEFAULT,
    createdAt: null,
    updatedAt: null,
    author: null,
    translations: [
      { locale: "en", pageId: "page", title: "Page", content },
      { locale: "zh", pageId: "page", title: "页面", content: "正文" },
    ],
  });
  db.where.mockResolvedValue([]);
  const result = await getPage(asMockDatabase(db), "page", "PUBLISHED_ONLY");
  expect(result?.content).toEqual({ en: content, zh: "正文" });
  expect(result?.imagesInContent).toEqual([]);
  const sizes = db.where.mock.calls.map(
    ([where]) => new SQLiteSyncDialect().sqlToQuery(where).params.length,
  );
  expect(sizes).toEqual([500, 500, 101]);
});
