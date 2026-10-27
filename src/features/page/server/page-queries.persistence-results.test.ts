import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";
import { getPage } from "./page-queries";

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
  function authorize(db: ReturnType<typeof createMockDb>) {
    db.from.mockImplementation((table: object) => {
      if (table === schema.user) {
        const actor = createMockDb();
        actor.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        return Object.assign(Promise.resolve([]), actor);
      }
      if (
        table === schema.postTranslation ||
        table === schema.settingTranslation ||
        table === schema.pageTranslation
      ) {
        const read = createMockDb();
        read.where.mockResolvedValue([]);
        return read;
      }
      return db;
    });
  }
  it.each(["status", "template"])(
    "rejects an unknown page %s during detail mapping",
    async (field) => {
      const db = createMockDb();
      authorize(db);
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
