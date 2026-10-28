import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
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

  it("rejects invalid status when loading a notification comment", async () => {
    const db = createMockDb();
    db.where.mockResolvedValue([{ ...commentRow, post: null, page: null }]);
    await expect(
      createCommentNotificationRepository(asMockDatabase(db)).getComment(
        "comment",
      ),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
