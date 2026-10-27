import { createCommentCommandRepository } from "@/features/comment/server/comment-command-repository";
import { toPublicCommentSource } from "@/features/comment/server/comment-dto";
import { toPublicComment } from "@/features/comment/server/comment-public-dto";
import { PostStatus } from "@/features/post/types/post.status";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
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
  it("does not claim a comment was created when the atomic target check rejects it", async () => {
    const db = createMockDb();
    authorize(db);
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
    authorize(db);
    db.returning.mockResolvedValue([commentRow]);
    await expect(
      createCommentCommandRepository(asMockDatabase(db)).update({
        id: "comment",
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("preserves a nullable stored comment status", async () => {
    const db = createMockDb();
    authorize(db);
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
