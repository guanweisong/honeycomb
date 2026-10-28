import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { getPage } from "@/features/page/server/page-queries";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" },
}));
describe("required persistence results", () => {
  it.each(["status", "template"])(
    "rejects an unknown page %s during detail mapping",
    async (field) => {
      const db = createMockDb();
      db.query.page.findFirst.mockResolvedValue({
        id: "page",
        version: 0,
        status: "PUBLISHED",
        template: "default",
        authorId: "author",
        views: 0,
        createdAt: null,
        updatedAt: null,
        author: null,
        translations: [],
        [field]: "UNKNOWN",
      });
      await expect(
        getPage(asMockDatabase(db), "page", "ALL"),
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    },
  );
});
