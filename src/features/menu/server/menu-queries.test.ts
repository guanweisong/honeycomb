import { expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
import { MenuType } from "@/features/menu/types/menu.type";
import { listMenus } from "@/features/menu/server/menu-queries";

it("groups each translation once while preserving title and branch semantics", async () => {
  const db = createMockDb();
  let reads = 0;
  const pages = Array.from({ length: 80 }, (_, index) => ({
    id: `page-${index}`,
  }));
  db.query.menu.findMany.mockResolvedValue(
    pages.map(({ id }, power) => ({
      id: `row-${id}`,
      pageId: id,
      categoryId: null,
      customId: null,
      type: MenuType.PAGE,
      parent: null,
      power,
      createdAt: null,
      updatedAt: null,
    })),
  );
  const translations = pages.flatMap(({ id }, index) => [
    {
      get pageId() {
        reads++;
        return id;
      },
      locale: "en",
      title: `Page ${index}`,
    },
    {
      get pageId() {
        reads++;
        return id;
      },
      locale: "zh",
      title: `页面 ${index}`,
    },
  ]);
  db.where.mockResolvedValueOnce(pages).mockResolvedValueOnce(translations);
  const result = await listMenus(asMockDatabase(db), "ALL");
  expect(result.total).toBe(80);
  expect(result.list[0]?.title).toEqual({ en: "Page 0", zh: "页面 0" });
  expect(result.list[79]?.title).toEqual({ en: "Page 79", zh: "页面 79" });
  expect(reads).toBeLessThanOrEqual(160 * 2);
});
