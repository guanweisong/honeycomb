import { describe, expect, it, vi } from "vitest";
import {
  createCategory,
  destroyCategories,
  updateCategory,
} from "@/features/category/application/category-use-cases";
import {
  destroyComments,
  updateComment,
} from "@/features/comment/application/comment-commands";
import {
  createLink,
  destroyLinks,
  updateLink,
} from "@/features/link/application/link-use-cases";
import { saveAllMenus } from "@/features/menu/application/menu-use-cases";
import {
  createPage,
  destroyPages,
  updatePage,
} from "@/features/page/application/page-use-cases";
import {
  createPost,
  destroyPosts,
  updatePost,
  updatePostTags,
} from "@/features/post/application/post-commands";
import { updateSetting } from "@/features/setting/application/setting-use-cases";
import {
  createTag,
  destroyTags,
  updateTag,
} from "@/features/tag/application/tag-use-cases";
import {
  createUser,
  destroyUsers,
  updateUser,
} from "@/features/user/application/user-commands";
import type { CategoryRecord } from "@/features/category/application/repository";
import type { CommentRecord } from "@/features/comment/application/repository";
import type { LinkRecord } from "@/features/link/application/repository";
import type { SettingRecord } from "@/features/setting/application/repository";
import type { TagRecord } from "@/features/tag/application/repository";
import type { UserRecord } from "@/features/user/application/repository";
import type { PublicContentInvalidator } from "@/packages/application/public-content-invalidator";
import { CommentStatus } from "@/packages/domain/content/comment";
import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { PostStatus } from "@/packages/domain/content/post-status";
import { TagType } from "@/packages/domain/content/tag";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { MenuType } from "@/packages/domain/navigation/menu";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

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

const commands = [
  commandCase("createCategory", category, (write, invalidator) =>
    createCategory(
      { create: write, find: async () => null, pathExists: async () => false },
      { title: localized, description: localized, path: category.path },
      invalidator,
    ),
  ),
  commandCase("updateCategory", category, (write, invalidator) =>
    updateCategory(
      {
        update: write,
        find: async () => category,
        pathExists: async () => false,
      },
      { id, title: localized },
      invalidator,
    ),
  ),
  commandCase("destroyCategories", success, (write, invalidator) =>
    destroyCategories({ destroy: write }, [id], invalidator),
  ),
  commandCase("createLink", link, (write, invalidator) =>
    createLink(
      { create: write },
      { name: link.name, url: link.url, logo: link.logo },
      invalidator,
    ),
  ),
  commandCase("updateLink", link, (write, invalidator) =>
    updateLink({ update: write }, { id, name: link.name }, invalidator),
  ),
  commandCase("destroyLinks", success, (write, invalidator) =>
    destroyLinks({ destroy: write }, [id], invalidator),
  ),
  commandCase("saveAllMenus", { count: 1 }, (write, invalidator) =>
    saveAllMenus(
      { saveAll: write },
      [{ id, type: MenuType.CATEGORY, power: 0 }],
      invalidator,
    ),
  ),
  commandCase("createPage", { id }, (write, invalidator) =>
    createPage({ create: write }, pageInput, "author", invalidator),
  ),
  commandCase("updatePage", { id }, (write, invalidator) =>
    updatePage(
      { update: write, findStatus: async () => PageStatus.DRAFT },
      { id, title: localized },
      invalidator,
    ),
  ),
  commandCase("publishPage", { id }, (write, invalidator) =>
    updatePage(
      { update: write, findStatus: async () => PageStatus.DRAFT },
      { id, status: PageStatus.PUBLISHED },
      invalidator,
    ),
  ),
  commandCase("destroyPages", success, (write, invalidator) =>
    destroyPages({ destroy: write }, [id], invalidator),
  ),
  commandCase("createPost", { id }, (write, invalidator) =>
    createPost({ create: write }, { categoryId: id }, "author", invalidator),
  ),
  commandCase("updatePost", { id }, (write, invalidator) =>
    updatePost(
      { update: write, findStatus: async () => PostStatus.DRAFT },
      { id, title: localized },
      invalidator,
    ),
  ),
  commandCase("publishPost", { id }, (write, invalidator) =>
    updatePost(
      { update: write, findStatus: async () => PostStatus.DRAFT },
      { id, status: PostStatus.PUBLISHED },
      invalidator,
    ),
  ),
  commandCase("destroyPosts", success, (write, invalidator) =>
    destroyPosts({ destroy: write }, [id], invalidator),
  ),
  commandCase("updatePostTags", success, (write, invalidator) =>
    updatePostTags(
      { updateTags: write },
      { postId: id, tagIds: [], type: TagType.ACTOR },
      invalidator,
    ),
  ),
  commandCase("updateSetting", setting, (write, invalidator) =>
    updateSetting({ update: write }, { id, siteName: localized }, invalidator),
  ),
  commandCase("createTag", tag, (write, invalidator) =>
    createTag({ create: write }, { name: localized }, invalidator),
  ),
  commandCase("updateTag", tag, (write, invalidator) =>
    updateTag({ update: write }, { id, name: localized }, invalidator),
  ),
  commandCase("destroyTags", success, (write, invalidator) =>
    destroyTags({ destroy: write }, [id], invalidator),
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
