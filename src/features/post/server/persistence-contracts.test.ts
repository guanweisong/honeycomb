import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createPost, updatePost, destroyPosts } from "./post-commands";
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
import { UserLevel, UserStatus } from "@/features/user/user";
import { loadPostRelations } from "./post-relations";
import { getPage } from "@/features/page/server/page-queries";
import { listMenus } from "@/features/menu/server";
import { toPublicComment } from "@/features/comment/server/comment-public-dto";
import { toPublicCommentSource } from "@/features/comment/server/comment-dto";
import { createCommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";
import * as schema from "@/lib/db/schema";

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

function authorize(db: ReturnType<typeof createMockDb>) {
  db.from.mockImplementation((table: object) => {
    if (table === schema.user) {
      const actor = createMockDb();
      actor.limit.mockResolvedValue([
        { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
      ]);
      return actor;
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
  it.each([false, true])(
    "rejects a missing or stale setting write target (exists: %s)",
    async (exists) => {
      const db = createMockDb();
      authorize(db);
      db.returning.mockResolvedValue([]);
      db.limit.mockResolvedValue(
        exists ? [{ id: "507f1f77bcf86cd799439011" }] : [],
      );
      await expect(
        updateSetting(
          asMockDatabase(db),
          {
            id: "507f1f77bcf86cd799439011",
            expectedVersion: 0,
            siteName: { en: "Changed" },
          },
          "author",
          invalidator,
        ),
      ).rejects.toMatchObject({ code: exists ? "CONFLICT" : "NOT_FOUND" });
    },
  );
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
      createMediaRepository(db).begin(
        { name: "image.png", size: 1, type: "image/png" },
        "author",
      ),
    ).rejects.toThrow("Media upload not created");
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
  it.each(["status", "type", "commentStatus"])(
    "rejects an unknown post %s during DTO mapping",
    async (field) => {
      const row: typeof schema.post.$inferSelect = {
        id: "post",
        version: 0,
        creationToken: null,
        creationInputHash: null,
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
      authorize(db);
      db.query.post.findMany.mockResolvedValue([
        {
          ...row,
          [field]: "UNKNOWN",
          author: null,
          cover: null,
          category: null,
          translations: [],
          postTags: [],
        },
      ]);
      await expect(
        loadPostRelations(asMockDatabase(db), [{ ...row, [field]: "UNKNOWN" }]),
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    },
  );
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
  it("rejects an unknown menu type before constructing navigation", async () => {
    const db = createMockDb();
    authorize(db);
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
  it("rejects invalid status in public comment data", () => {
    expect(() => toPublicComment(toPublicCommentSource(commentRow))).toThrow(
      expect.objectContaining({ code: "INTERNAL_SERVER_ERROR" }),
    );
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

  it("uses only the explicit invalidator for post public synchronization", async () => {
    const db = createMockDb();
    authorize(db);
    db.returning.mockResolvedValue([{ id: "post", version: 1 }]);
    db.limit.mockResolvedValue([
      { id: "post", version: 0, status: PostStatus.DRAFT },
    ]);
    const database = asMockDatabase(db);
    invalidator.invalidate.mockClear();

    await createPost(
      database,
      { categoryId: "category", creationToken },
      "author",
      invalidator,
    );
    await updatePost(
      database,
      { id: "507f1f77bcf86cd799439011", expectedVersion: 0, movieTime: null },
      "author",
      invalidator,
    );
    await destroyPosts(
      database,
      { items: [{ id: "507f1f77bcf86cd799439011", expectedVersion: 0 }] },
      "author",
      invalidator,
    );
    await updatePost(
      database,
      { id: "507f1f77bcf86cd799439011", expectedVersion: 0, movieActorIds: [] },
      "author",
      invalidator,
    );

    expect(invalidator.invalidate).toHaveBeenCalledTimes(4);
    expect(mockBumpCacheVersion).not.toHaveBeenCalled();
  });
});
