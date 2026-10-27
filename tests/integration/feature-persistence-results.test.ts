import {
  createCategory,
  updateCategory,
} from "@/features/category/server/category-commands";
import { createCommentCommandRepository } from "@/features/comment/server/comment-command-repository";
import { createLink, updateLink } from "@/features/link/server/link-operations";
import { createMediaRepository } from "@/features/media/server/media-repository";
import { createUploadIntent } from "@/features/media/server/upload-intent";
import { createPage, updatePage } from "@/features/page/server/page-commands";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { createPost, updatePost } from "@/features/post/server/post-commands";
import { PostStatus } from "@/features/post/types/post.status";
import { createTag, updateTag } from "@/features/tag/server/tag-commands";
import { createUserRepository } from "@/features/user/server/user-repository";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it, vi } from "vitest";

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

const invalidator = {
  invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
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
const creationToken = "11111111-1111-4111-8111-111111111111";

describe("required persistence results", () => {
  const updates = [
    (db: Database, input: { id: string }) =>
      updatePost(
        db,
        {
          ...input,
          id: "507f1f77bcf86cd799439011",
          expectedVersion: 0,
          title: { en: "Changed" },
        },
        "author",
        invalidator,
      ),
    (db: Database) =>
      updatePage(
        db,
        {
          id: "507f1f77bcf86cd799439011",
          expectedVersion: 0,
          title: { en: "Changed", zh: "变更" },
        },
        "author",
        invalidator,
      ),
    updateCategory,
    updateTag,
    updateLink,

    (db: Database, input: { id: string }) =>
      createCommentCommandRepository(db).update(input),
    (db: Database, input: { id: string }) =>
      createUserRepository(db).update(input),
  ];
  it.each(updates)("rejects a missing update target (%#)", async (update) => {
    const db = createMockDb();
    authorize(db);
    db.returning.mockResolvedValue([]);
    db.limit.mockResolvedValue([]);
    await expect(
      update(asMockDatabase(db), { id: "missing" }, invalidator),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects empty create results across repositories", async () => {
    const fake = createMockDb();
    authorize(fake);
    fake.returning.mockResolvedValue([]);
    fake.limit.mockResolvedValue([]);
    const db = asMockDatabase(fake);
    await expect(
      createPost(
        db,
        { categoryId: "category", creationToken },
        "author",
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      createPage(
        db,
        {
          creationToken,
          title: { en: "title", zh: "标题" },
          content: { en: "body", zh: "正文" },
          template: PageTemplate.DEFAULT,
        },
        "author",
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      createMediaRepository(db).insertRegistered(
        createUploadIntent(
          {
            name: "image.png",
            size: 1,
            type: "image/png",
            sha256: "a".repeat(64),
          },
          "author",
        ).payload,
        "media/final.png",
        { size: 1, type: "image/png", width: 1, height: 1, color: null },
        "author",
      ),
    ).rejects.toThrow("Media registration not confirmed");
    const creates = [
      () =>
        createCategory(
          db,
          {
            path: "category",
            title: { en: "title", zh: "标题" },
            description: { en: "description", zh: "描述" },
          },
          invalidator,
        ),
      () => createTag(db, { name: { en: "tag", zh: "标签" } }, invalidator),
      () =>
        createLink(
          db,
          { name: "link", url: "https://test.dev", logo: "logo" },
          invalidator,
        ),
      () =>
        createUserRepository(db).create({
          name: "user",
          email: "a@test.dev",
          password: "password",
        }),
    ];
    for (const create of creates)
      await expect(create()).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      });
  });
  it.each([
    (db: Database) =>
      updatePost(
        db,
        {
          id: "507f1f77bcf86cd799439011",
          expectedVersion: 0,
          status: PostStatus.PUBLISHED,
        },
        "author",
        invalidator,
      ),
    (db: Database) =>
      updatePage(
        db,
        {
          id: "507f1f77bcf86cd799439011",
          expectedVersion: 0,
          status: PageStatus.PUBLISHED,
        },
        "author",
        invalidator,
      ),
    (db: Database) => createCommentCommandRepository(db).findStatus("id"),
  ])("rejects unknown stored status (%#)", async (read) => {
    const db = createMockDb();
    authorize(db);
    db.limit.mockResolvedValue([{ status: "UNKNOWN", version: 0 }]);
    await expect(read(asMockDatabase(db))).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
