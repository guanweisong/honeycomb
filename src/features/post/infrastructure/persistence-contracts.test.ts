import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createPostCommandRepository } from "./post-command-repository";
import { createPageCommandRepository } from "@/features/page/infrastructure/page-command-repository";
import { createCommentCommandRepository } from "@/features/comment/infrastructure/comment-command-repository";
import { createCategoryRepository } from "@/features/category/infrastructure/category-repository";
import { createTagRepository } from "@/features/tag/infrastructure/tag-repository";
import { createLinkRepository } from "@/features/link/infrastructure/link-repository";
import { createMediaRepository } from "@/features/media/infrastructure/media-repository";
import { createUserRepository } from "@/features/user/infrastructure/user-repository";
import { createSettingRepository } from "@/features/setting/infrastructure/setting-repository";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { loadPostRelations } from "./post-query-repository";
import { createPageQueryRepository } from "@/features/page/infrastructure/page-query-repository";
import { createMenuRepository } from "@/features/menu/infrastructure/menu-repository";
import { toPublicComment } from "@/features/comment/infrastructure/comment-dto";
import { createCommentNotificationRepository } from "@/features/comment/infrastructure/comment-notification-repository";
import type * as schema from "@/packages/infrastructure/db/schema";

vi.mock("@/packages/infrastructure/observability/server", () => ({ observeDbOperation: (_name: string, _kind: string, operation: () => unknown) => operation() }));
vi.mock("@/packages/infrastructure/cache/upstash-cache", () => ({ bumpCacheVersion: vi.fn() }));
vi.mock("@/env/client", () => ({ clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" } }));

const commentRow: typeof schema.comment.$inferSelect = {
  id: "comment", author: "author", content: "text", site: null, email: "a@test.dev",
  parentId: null, postId: "post", pageId: null, customId: null, status: "UNKNOWN",
  createdAt: null, updatedAt: null, userAgent: null, ip: null,
};

describe("required persistence results", () => {
  const updateFactories = [createPostCommandRepository, createPageCommandRepository, createCommentCommandRepository, createCategoryRepository, createTagRepository, createLinkRepository, createUserRepository, createSettingRepository];
  it.each(updateFactories)("rejects a missing update target (%#)", async (factory) => {
    const db = createMockDb();
    db.returning.mockResolvedValue([]);
    await expect(factory(asMockDatabase(db)).update({ id: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects empty create results across repositories", async () => {
    const fake = createMockDb();
    fake.returning.mockResolvedValue([]);
    fake.limit.mockResolvedValue([{ status: "PUBLISHED", commentStatus: "ENABLE" }]);
    const db = asMockDatabase(fake);
    const creates = [
      () => createPostCommandRepository(db).create({ categoryId: "category" }, "author"),
      () => createPageCommandRepository(db).create({ title: { en: "title", zh: "标题" }, content: { en: "body", zh: "正文" }, template: PageTemplate.DEFAULT }, "author"),
      () => createCommentCommandRepository(db).create(new Headers(), { author: "author", email: "a@test.dev", content: "text", postId: "post" }),
      () => createCategoryRepository(db).create({ path: "category", title: { en: "title", zh: "标题" }, description: { en: "description", zh: "描述" } }),
      () => createTagRepository(db).create({ name: { en: "tag", zh: "标签" } }),
      () => createLinkRepository(db).create({ name: "link", url: "https://test.dev", logo: "logo" }),
      () => createMediaRepository(db).create({ name: "image", key: "image", size: 1, type: "image/png" }),
      () => createUserRepository(db).create({ name: "user", email: "a@test.dev", password: "password" }),
    ];
    for (const create of creates) await expect(create()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it.each([createPostCommandRepository, createPageCommandRepository, createCommentCommandRepository])("rejects unknown stored status (%#)", async (factory) => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ status: "UNKNOWN" }]);
    await expect(factory(asMockDatabase(db)).findStatus("id")).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it.each(["status", "type", "commentStatus"])("rejects an unknown post %s during DTO mapping", async (field) => {
    const row: typeof schema.post.$inferSelect = { id: "post", authorId: "author", categoryId: "category", title: null, content: null, excerpt: null, status: "PUBLISHED", type: "ARTICLE", commentStatus: "ENABLE", coverId: null, quoteAuthor: null, quoteContent: null, movieTime: null, galleryLocation: null, galleryTime: null, views: 0, createdAt: null, updatedAt: null };
    const db = createMockDb();
    db.query.post.findMany.mockResolvedValue([]);
    await expect(loadPostRelations(asMockDatabase(db), [{ ...row, [field]: "UNKNOWN" }])).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it.each(["status", "template"])("rejects an unknown page %s during detail mapping", async (field) => {
    const db = createMockDb();
    db.query.page.findFirst.mockResolvedValue({ id: "page", status: "PUBLISHED", template: "default", title: null, content: null, authorId: "author", views: 0, createdAt: null, updatedAt: null, author: null, [field]: "UNKNOWN" });
    await expect(createPageQueryRepository(asMockDatabase(db)).detail("page", "ALL")).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("rejects an unknown menu type before constructing navigation", async () => {
    const db = createMockDb();
    db.query.menu.findMany.mockResolvedValue([{ id: "menu", parent: null, power: 0, type: "UNKNOWN", categoryId: null, pageId: null, customId: null, createdAt: null, updatedAt: null }]);
    await expect(createMenuRepository(asMockDatabase(db)).list("ALL")).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("rejects invalid status in public comment data", () => {
    expect(() => toPublicComment({ id: "comment", author: "author", content: "text", site: null, email: "a@test.dev", parentId: null, status: "UNKNOWN", createdAt: null })).toThrow(expect.objectContaining({ code: "INTERNAL_SERVER_ERROR" }));
  });
  it("rejects invalid status when mapping a written comment", async () => {
    const db = createMockDb();
    db.returning.mockResolvedValue([commentRow]);
    await expect(createCommentCommandRepository(asMockDatabase(db)).update({ id: "comment" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("rejects invalid status when loading a notification comment", async () => {
    const db = createMockDb();
    db.where.mockResolvedValue([{ ...commentRow, post: null, page: null }]);
    await expect(createCommentNotificationRepository(asMockDatabase(db)).getComment("comment")).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it.each(["status", "level"])("rejects unknown user %s during state lookup", async (field) => {
    const db = createMockDb();
    db.where.mockResolvedValue([{ status: "ENABLE", level: "GUEST", [field]: "UNKNOWN" }]);
    await expect(createUserRepository(asMockDatabase(db)).getStatus("user")).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("preserves a nullable stored comment status", async () => {
    const db = createMockDb();
    db.limit.mockResolvedValue([{ status: null }]);
    await expect(createCommentCommandRepository(asMockDatabase(db)).findStatus("comment")).resolves.toBeNull();
    expect(toPublicComment({ ...commentRow, status: null }).status).toBeNull();
  });
});
