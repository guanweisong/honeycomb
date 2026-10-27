import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";
import { createCommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";

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
  const commentRow: typeof schema.comment.$inferSelect = {
    id: "comment",
    author: "author",
    content: "text",
    site: null,
    email: "a@test.dev",
    parentId: null,
    postId: "post",
    pageId: null,
    customId: null,
    status: "UNKNOWN",
    createdAt: null,
    updatedAt: null,
    userAgent: null,
    ip: null,
  };
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
  it("rejects invalid status when loading a notification comment", async () => {
    const db = createMockDb();
    authorize(db);
    db.where.mockResolvedValue([{ ...commentRow, post: null, page: null }]);
    await expect(
      createCommentNotificationRepository(asMockDatabase(db)).getComment(
        "comment",
      ),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
