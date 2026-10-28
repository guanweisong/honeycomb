import { createCommentCommandRepository } from "@/features/comment/server/comment-command-repository";
import { toPublicCommentSource } from "@/features/comment/server/comment-dto";
import { toPublicComment } from "@/features/comment/server/comment-public-dto";
import { PostStatus } from "@/features/post/types/post.status";
import * as schema from "@/lib/db/schema";
import { EnableStatus } from "@/lib/validation/enable-status";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
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

  it("does not claim a comment was created when the atomic target check rejects it", async () => {
    const db = createMockDb();
    db.returning.mockResolvedValue([]);
    await expect(
      createCommentCommandRepository(asMockDatabase(db)).createIfTargetMatches(
        { ip: null, userAgent: null },
        {
          author: "author",
          email: "a@test.dev",
          content: "text",
          postId: "post",
        },
        {
          type: "post",
          status: PostStatus.PUBLISHED,
          commentStatus: EnableStatus.ENABLE,
        },
      ),
    ).resolves.toBeNull();
  });
  it("rejects invalid status when mapping a written comment", async () => {
    const db = createMockDb();
    db.returning.mockResolvedValue([commentRow]);
    await expect(
      createCommentCommandRepository(asMockDatabase(db)).update({
        id: "comment",
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("preserves a nullable stored comment status", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ status: null }]);
    await expect(
      createCommentCommandRepository(asMockDatabase(db)).findStatus("comment"),
    ).resolves.toBeNull();
    expect(
      toPublicComment(toPublicCommentSource({ ...commentRow, status: null }))
        .status,
    ).toBeNull();
  });
});
