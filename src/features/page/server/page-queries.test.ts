import { describe, expect, it } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { listPages } from "./page-queries";
import { PageTemplate } from "../page-template";
import { PageStatus } from "../page-status";
const row = {
  id: "507f1f77bcf86cd799439011",
  authorId: "author",
  version: 0,
  status: PageStatus.DRAFT,
  template: PageTemplate.DEFAULT,
  views: 0,
  createdAt: null,
  updatedAt: null,
};
describe("page relation read snapshot", () => {
  it("gets revision and translations from the same reread and drops disappeared rows", async () => {
    const fake = createMockDb();
    fake.offset.mockResolvedValue([
      row,
      { ...row, id: "507f1f77bcf86cd799439012" },
    ]);
    fake.where.mockReturnValueOnce(fake).mockResolvedValueOnce([{ count: 2 }]);
    fake.query.page.findMany.mockResolvedValue([
      {
        ...row,
        version: 2,
        creationToken: "private",
        creationInputHash: "private",
        author: null,
        translations: [
          { pageId: row.id, locale: "en", title: "current", content: "body" },
          { pageId: row.id, locale: "zh", title: "当前", content: "正文" },
        ],
      },
    ]);
    const result = await listPages(asMockDatabase(fake), {}, "ALL");
    expect(result.list).toHaveLength(1);
    expect(result.list[0]).toMatchObject({
      id: row.id,
      version: 2,
      title: { en: "current", zh: "当前" },
    });
    expect(result.list[0]).not.toHaveProperty("creationToken");
    expect(result.list[0]).not.toHaveProperty("creationInputHash");
  });
});
