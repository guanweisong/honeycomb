import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import {
  createPost,
  updatePost,
  destroyPosts,
  updatePostTags,
} from "./post-commands";
import { createPage, updatePage } from "@/features/page/server";
import { createCommentCommandRepository } from "@/features/comment/server/comment-command-repository";
import { createCategory, updateCategory } from "@/features/category/server";
import { createTag, updateTag } from "@/features/tag/server";
import { createLink, updateLink } from "@/features/link/server";
import { createMediaRepository } from "@/features/media/server/media-repository";
import { createUserRepository } from "@/features/user/server/user-repository";
import { updateSetting } from "@/features/setting/server";
import { PageStatus } from "@/features/page/page-status";
import { PostStatus } from "../post-status";
import { EnableStatus } from "@/lib/validation/enable-status";
import type { Database } from "@/lib/db/db";
import { PageTemplate } from "@/features/page/page-template";
import { TagType } from "@/features/tag/tag-kind";
import { loadPostRelations } from "./post-relations";
import { getPage } from "@/features/page/server/page-queries";
import { listMenus } from "@/features/menu/server";
import { toPublicComment } from "@/features/comment/server/comment-public-dto";
import { toPublicCommentSource } from "@/features/comment/server/comment-dto";
import { createCommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";
import type * as schema from "@/lib/db/schema";

const mockBumpCacheVersion = vi.hoisted(() => vi.fn());

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
vi.mock("@/lib/cache/upstash-cache", () => ({
  bumpCacheVersion: mockBumpCacheVersion,
}));
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" },
}));

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

const invalidator = {
  invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
};

describe("required persistence results", () => {
  const updates = [
    updatePost,
    updatePage,
    updateCategory,
    updateTag,
    updateLink,
    updateSetting,
    (db: Database, input: { id: string }) =>
      createCommentCommandRepository(db).update(input),
    (db: Database, input: { id: string }) =>
      createUserRepository(db).update(input),
  ];
  it.each(updates)("rejects a missing update target (%#)", async (update) => {
    const db = createMockDb();
    db.returning.mockResolvedValue([]);
    db.limit.mockResolvedValue([]);
    await expect(
      update(asMockDatabase(db), { id: "missing" }, invalidator),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects empty create results across repositories", async () => {
    const fake = createMockDb();
    fake.returning.mockResolvedValue([]);
    fake.limit.mockResolvedValue([]);
    const db = asMockDatabase(fake);
    const creates = [
      () => createPost(db, { categoryId: "category" }, "author", invalidator),
      () =>
        createPage(
          db,
          {
            title: { en: "title", zh: "标题" },
            content: { en: "body", zh: "正文" },
            template: PageTemplate.DEFAULT,
          },
          "author",
          invalidator,
        ),
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
        createMediaRepository(db).create({
          name: "image",
          key: "image",
          size: 1,
          type: "image/png",
        }),
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
      updatePost(db, { id: "id", status: PostStatus.PUBLISHED }, invalidator),
    (db: Database) =>
      updatePage(db, { id: "id", status: PageStatus.PUBLISHED }, invalidator),
    (db: Database) => createCommentCommandRepository(db).findStatus("id"),
  ])("rejects unknown stored status (%#)", async (read) => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ status: "UNKNOWN" }]);
    await expect(read(asMockDatabase(db))).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
  it.each(["status", "type", "commentStatus"])(
    "rejects an unknown post %s during DTO mapping",
    async (field) => {
      const row: typeof schema.post.$inferSelect = {
        id: "post",
        authorId: "author",
        categoryId: "category",
        status: "PUBLISHED",
        type: "ARTICLE",
        commentStatus: "ENABLE",
        coverId: null,
        movieTime: null,
        galleryTime: null,
        views: 0,
        createdAt: null,
        updatedAt: null,
      };
      const db = createMockDb();
      db.query.post.findMany.mockResolvedValue([]);
      await expect(
        loadPostRelations(asMockDatabase(db), [{ ...row, [field]: "UNKNOWN" }]),
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    },
  );
  it.each(["status", "template"])(
    "rejects an unknown page %s during detail mapping",
    async (field) => {
      const db = createMockDb();
      db.query.page.findFirst.mockResolvedValue({
        id: "page",
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
  it("rejects an unknown menu type before constructing navigation", async () => {
    const db = createMockDb();
    db.query.menu.findMany.mockResolvedValue([
      {
        id: "menu",
        parent: null,
        power: 0,
        type: "UNKNOWN",
        categoryId: null,
        pageId: null,
        customId: null,
        createdAt: null,
        updatedAt: null,
      },
    ]);
    await expect(listMenus(asMockDatabase(db), "ALL")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
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
  it("rejects invalid status in public comment data", () => {
    expect(() => toPublicComment(toPublicCommentSource(commentRow))).toThrow(
      expect.objectContaining({ code: "INTERNAL_SERVER_ERROR" }),
    );
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
  it("rejects invalid status when loading a notification comment", async () => {
    const db = createMockDb();
    db.where.mockResolvedValue([{ ...commentRow, post: null, page: null }]);
    await expect(
      createCommentNotificationRepository(asMockDatabase(db)).getComment(
        "comment",
      ),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it.each(["status", "level"])(
    "rejects unknown user %s during state lookup",
    async (field) => {
      const db = createMockDb();
      db.where.mockResolvedValue([
        { status: "ENABLE", level: "GUEST", [field]: "UNKNOWN" },
      ]);
      await expect(
        createUserRepository(asMockDatabase(db)).getStatus("user"),
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    },
  );
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

  it("uses only the explicit invalidator for post public synchronization", async () => {
    const db = createMockDb();
    db.returning.mockResolvedValue([{ id: "post" }]);
    db.limit.mockResolvedValue([
      { id: "post", authorId: "author", categoryId: "category" },
    ]);
    const database = asMockDatabase(db);
    invalidator.invalidate.mockClear();

    await createPost(
      database,
      { categoryId: "category" },
      "author",
      invalidator,
    );
    await updatePost(database, { id: "post" }, invalidator);
    await destroyPosts(database, ["post"], invalidator);
    await updatePostTags(
      database,
      {
        postId: "post",
        tagIds: [],
        type: TagType.ACTOR,
      },
      invalidator,
    );

    expect(invalidator.invalidate).toHaveBeenCalledTimes(4);
    expect(mockBumpCacheVersion).not.toHaveBeenCalled();
  });
});
