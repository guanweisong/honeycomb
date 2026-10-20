import { describe, expect, it, vi, type Mock } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
import {
  createCategory,
  destroyCategories,
  updateCategory,
} from "@/features/category/server";
import {
  destroyComments,
  updateComment,
} from "@/features/comment/server/comment-commands";
import { createLink, destroyLinks, updateLink } from "@/features/link/server";
import { saveAllMenus } from "@/features/menu/server";
import { createPage, destroyPages, updatePage } from "@/features/page/server";
import {
  createPost,
  destroyPosts,
  updatePost,
} from "@/features/post/server/post-commands";
import { updateSetting } from "@/features/setting/server";
import { createTag, destroyTags, updateTag } from "@/features/tag/server";
import {
  createUser,
  destroyUsers,
  updateUser,
} from "@/features/user/server/user-commands";
import type { CategoryRecord } from "@/features/category/types";
import type { CommentRecord } from "@/features/comment/types";
import type { LinkRecord } from "@/features/link/types";
import type { SettingRecord } from "@/features/setting/types";
import type { TagRecord } from "@/features/tag/types";
import type { UserRecord } from "@/features/user/types";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { CommentStatus } from "@/features/comment/comment-status";
import { PageStatus } from "@/features/page/page-status";
import { PageTemplate } from "@/features/page/page-template";
import { PostStatus } from "@/features/post/post-status";
import { UserLevel, UserStatus } from "@/features/user/user";
import { MenuType } from "@/features/menu/menu-types";
import { EnableStatus } from "@/lib/validation/enable-status";

const id = "507f1f77bcf86cd799439011";
const localized = { en: "Saved", zh: "已保存" };
const success = { success: true as const };
const category = {
  id,
  title: localized,
  description: localized,
  parent: null,
  path: "saved",
  status: EnableStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
} satisfies CategoryRecord;
const link = {
  id,
  name: "Saved",
  url: "https://example.test",
  logo: "https://example.test/logo.png",
  description: null,
  status: EnableStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
} satisfies LinkRecord;
const tag = {
  id,
  name: localized,
  createdAt: null,
  updatedAt: null,
} satisfies TagRecord;
const setting = {
  id,
  version: 1,
  siteName: localized,
  siteSubName: null,
  siteSignature: null,
  siteCopyright: null,
  siteRecordNo: null,
  siteRecordUrl: null,
  createdAt: null,
  updatedAt: null,
} satisfies SettingRecord;
const user = {
  id,
  name: "Saved",
  email: "saved@example.test",
  level: UserLevel.EDITOR,
  status: UserStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
} satisfies UserRecord;
const comment = {
  id,
  author: "Saved",
  content: "Saved comment",
  email: "saved@example.test",
  site: null,
  parentId: null,
  postId: id,
  pageId: null,
  customId: null,
  status: CommentStatus.PUBLISH,
  createdAt: null,
  updatedAt: null,
  userAgent: null,
  ip: null,
} satisfies CommentRecord;
const pageInput = {
  creationToken: "11111111-1111-4111-8111-111111111111",
  title: localized,
  content: localized,
  template: PageTemplate.DEFAULT,
};

// Each adapter keeps the real repository result type, while sharing only the
// write outcome and invalidator checks common to all administrative commands.
function commandCase<Result extends object>(
  name: string,
  saved: Result,
  execute: (
    write: () => Promise<Result>,
    invalidator: PublicContentInvalidator,
  ) => Promise<unknown>,
) {
  return {
    name,
    saved,
    setup() {
      const write = vi.fn(async (): Promise<Result> => saved);
      return {
        write,
        run: (invalidator: PublicContentInvalidator) =>
          execute(write, invalidator),
      };
    },
  };
}

// Real server operations receive a mocked Drizzle boundary. The tracked mock is
// the transaction or statement that must finish before cache synchronization.
function databaseCase<Result extends object>(
  name: string,
  saved: Result,
  execute: (
    db: Database,
    invalidator: PublicContentInvalidator,
  ) => Promise<unknown>,
  writeKind: "transaction" | "returning" | "where" = "transaction",
) {
  return {
    name,
    saved,
    setup() {
      const db = createMockDb();
      db.returning.mockResolvedValue([saved]);
      db.select.mockImplementation((projection?: object) => {
        const read = createMockDb();
        const isPathCheck =
          projection &&
          Object.keys(projection).length === 1 &&
          "id" in projection;
        const isStatusCheck =
          projection &&
          Object.keys(projection).length === 1 &&
          "status" in projection;
        read.limit.mockResolvedValue(
          isPathCheck ? [] : isStatusCheck ? [{ status: "DRAFT" }] : [saved],
        );
        read.from.mockImplementation((table: object) => {
          if (table === schema.user)
            read.limit.mockResolvedValue([
              { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
            ]);
          if (table === schema.post || table === schema.page)
            read.limit.mockResolvedValue([
              { id, version: 0, status: PostStatus.DRAFT },
            ]);
          if (
            name === "saveAllMenus" &&
            table === schema.category &&
            isPathCheck
          )
            read.where.mockResolvedValue([{ id }]);
          let translations: object[] | undefined;
          if (table === schema.categoryTranslation)
            translations = [
              {
                categoryId: id,
                locale: "en",
                title: "Saved",
                description: "Saved",
              },
              {
                categoryId: id,
                locale: "zh",
                title: "已保存",
                description: "已保存",
              },
            ];
          if (table === schema.tagTranslation)
            translations = [
              { tagId: id, locale: "en", name: "Saved" },
              { tagId: id, locale: "zh", name: "已保存" },
            ];
          if (
            table === schema.settingTranslation ||
            table === schema.postTranslation ||
            table === schema.pageTranslation
          )
            translations = [];
          if (translations) read.where.mockResolvedValue(translations);
          return read;
        });
        return read;
      });
      if (writeKind === "where") db.where.mockResolvedValue(undefined);
      const write: Mock = db[writeKind];
      return {
        write,
        run: (invalidator: PublicContentInvalidator) =>
          execute(asMockDatabase(db), invalidator),
      };
    },
  };
}

const commands = [
  databaseCase("createCategory", category, (db, invalidator) =>
    createCategory(
      db,
      { title: localized, description: localized, path: category.path },
      invalidator,
    ),
  ),
  databaseCase("updateCategory", category, (db, invalidator) =>
    updateCategory(db, { id, title: localized }, invalidator),
  ),
  databaseCase(
    "destroyCategories",
    success,
    (db, invalidator) => destroyCategories(db, [id], invalidator),
    "where",
  ),
  databaseCase(
    "createLink",
    link,
    (db, invalidator) =>
      createLink(
        db,
        { name: link.name, url: link.url, logo: link.logo },
        invalidator,
      ),
    "returning",
  ),
  databaseCase(
    "updateLink",
    link,
    (db, invalidator) => updateLink(db, { id, name: link.name }, invalidator),
    "returning",
  ),
  databaseCase(
    "destroyLinks",
    success,
    (db, invalidator) => destroyLinks(db, [id], invalidator),
    "where",
  ),
  databaseCase("saveAllMenus", { count: 1, version: 1 }, (db, invalidator) =>
    saveAllMenus(
      db,
      {
        expectedVersion: 0,
        items: [{ id, type: MenuType.CATEGORY, power: 0 }],
      },
      "author",
      invalidator,
    ),
  ),
  databaseCase("createPage", { id, version: 0 }, (db, invalidator) =>
    createPage(db, pageInput, "author", invalidator),
  ),
  databaseCase("updatePage", { id, version: 1 }, (db, invalidator) =>
    updatePage(
      db,
      { id, expectedVersion: 0, title: localized },
      "author",
      invalidator,
    ),
  ),
  databaseCase("publishPage", { id, version: 1 }, (db, invalidator) =>
    updatePage(
      db,
      { id, expectedVersion: 0, status: PageStatus.PUBLISHED },
      "author",
      invalidator,
    ),
  ),
  databaseCase("destroyPages", success, (db, invalidator) =>
    destroyPages(
      db,
      { items: [{ id, expectedVersion: 0 }] },
      "author",
      invalidator,
    ),
  ),
  databaseCase("createPost", { id, version: 0 }, (db, invalidator) =>
    createPost(
      db,
      { categoryId: id, creationToken: "11111111-1111-4111-8111-111111111111" },
      "author",
      invalidator,
    ),
  ),
  databaseCase("updatePost", { id, version: 1 }, (db, invalidator) =>
    updatePost(
      db,
      { id, expectedVersion: 0, title: localized },
      "author",
      invalidator,
    ),
  ),
  databaseCase("publishPost", { id, version: 1 }, (db, invalidator) =>
    updatePost(
      db,
      { id, expectedVersion: 0, status: PostStatus.PUBLISHED },
      "author",
      invalidator,
    ),
  ),
  databaseCase("destroyPosts", success, (db, invalidator) =>
    destroyPosts(
      db,
      { items: [{ id, expectedVersion: 0 }] },
      "author",
      invalidator,
    ),
  ),
  databaseCase("updatePost relations", { id, version: 1 }, (db, invalidator) =>
    updatePost(
      db,
      { id, expectedVersion: 0, movieActorIds: [] },
      "author",
      invalidator,
    ),
  ),
  databaseCase("updateSetting", setting, (db, invalidator) =>
    updateSetting(
      db,
      { id, expectedVersion: 0, siteName: localized },
      "author",
      invalidator,
    ),
  ),
  databaseCase("createTag", tag, (db, invalidator) =>
    createTag(db, { name: localized }, invalidator),
  ),
  databaseCase("updateTag", tag, (db, invalidator) =>
    updateTag(db, { id, name: localized }, invalidator),
  ),
  databaseCase("destroyTags", success, (db, invalidator) =>
    destroyTags(db, [id], invalidator),
  ),
  commandCase("createUser", user, (write, invalidator) =>
    createUser(
      { create: write },
      { name: user.name, email: user.email, password: "password123" },
      invalidator,
    ),
  ),
  commandCase("updateUser", user, (write, invalidator) =>
    updateUser(
      { update: write, getStatus: async () => user },
      { id, name: user.name },
      UserLevel.ADMIN,
      invalidator,
    ),
  ),
  commandCase(
    "updateUser status",
    { ...user, status: UserStatus.DISABLE },
    (write, invalidator) =>
      updateUser(
        { update: write, getStatus: async () => user },
        { id, status: UserStatus.DISABLE },
        UserLevel.ADMIN,
        invalidator,
      ),
  ),
  commandCase("destroyUsers", success, (write, invalidator) =>
    destroyUsers(
      { destroy: write, getStates: async () => [user] },
      [id],
      invalidator,
    ),
  ),
  commandCase("updateComment", comment, (write, invalidator) =>
    updateComment(
      { update: write, findStatus: async () => CommentStatus.PUBLISH },
      { id, content: comment.content },
      invalidator,
    ),
  ),
  commandCase("moderateComment", comment, (write, invalidator) =>
    updateComment(
      { update: write, findStatus: async () => CommentStatus.TO_AUDIT },
      { id, status: CommentStatus.PUBLISH },
      invalidator,
    ),
  ),
  commandCase("destroyComments", success, (write, invalidator) =>
    destroyComments({ destroy: write }, [id], invalidator),
  ),
];

describe.each(commands)(
  "$name public synchronization result",
  ({ saved, setup }) => {
    it.each(["completed", "degraded"] as const)(
      "preserves the saved result and reports %s without repeating the write",
      async (state) => {
        const { write, run } = setup();
        const invalidate = vi
          .fn<PublicContentInvalidator["invalidate"]>()
          .mockResolvedValue({ state });

        await expect(run({ invalidate })).resolves.toEqual({
          ...saved,
          publicSync: state,
        });
        expect(write).toHaveBeenCalledOnce();
        expect(invalidate).toHaveBeenCalledOnce();
        expect(write).toHaveBeenCalledBefore(invalidate);
        expect(saved).not.toHaveProperty("publicSync");
      },
    );

    it("preserves a write failure and never attempts synchronization", async () => {
      const { write, run } = setup();
      const failure = new Error("write failed");
      write.mockRejectedValue(failure);
      const invalidate = vi
        .fn<PublicContentInvalidator["invalidate"]>()
        .mockResolvedValue({ state: "completed" });

      await expect(run({ invalidate })).rejects.toBe(failure);
      expect(write).toHaveBeenCalledOnce();
      expect(invalidate).not.toHaveBeenCalled();
    });
  },
);
