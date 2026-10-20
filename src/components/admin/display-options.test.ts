// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  CommentStatusName,
  commentStatusOptions,
} from "../../features/comment/admin/options";
import {
  PageTemplateName,
  pageTemplateOptions,
  PageStatusName,
  pageStatusOptions,
} from "../../features/page/admin/options";
import {
  PostStatusName,
  postStatusOptions,
  PostTypeName,
  postTypeOptions,
} from "../../features/post/admin/options";
import {
  UserLevelName,
  userLevelOptions,
  UserStatusName,
  userStatusOptions,
} from "../../features/user/admin/options";
import { MenuTypeName } from "../../features/menu/admin/options";
import { EnableStatusName, enableStatusOptions } from "./enable-status-options";

describe("admin display names and options", () => {
  it("preserves comment labels and option order, including the blocked label", () => {
    expect(CommentStatusName).toEqual({
      TO_AUDIT: "待审核",
      PUBLISH: "已发布",
      RUBBISH: "垃圾评论",
      BAN: "已屏蔽",
    });
    expect(commentStatusOptions).toEqual([
      { label: "待审核", value: "TO_AUDIT" },
      { label: "已发布", value: "PUBLISH" },
      { label: "垃圾评论", value: "RUBBISH" },
      { label: "已屏蔽", value: "BAN" },
    ]);
  });

  it("preserves page status labels and option order", () => {
    expect(PageStatusName).toEqual({
      PUBLISHED: "已发布",
      DRAFT: "草稿",
      TO_AUDIT: "待审核",
    });
    expect(pageStatusOptions).toEqual([
      { label: "已发布", value: "PUBLISHED" },
      { label: "草稿", value: "DRAFT" },
      { label: "待审核", value: "TO_AUDIT" },
    ]);
  });

  it("preserves page template labels and option order", () => {
    expect(PageTemplateName).toEqual({
      DEFAULT: "默认",
      FRIENDLY_LINKS: "友情链接",
    });
    expect(pageTemplateOptions).toEqual([
      { label: "默认", value: "default" },
      { label: "友情链接", value: "friendly-links" },
    ]);
  });

  it("preserves post status labels and option order", () => {
    expect(PostStatusName).toEqual({
      PUBLISHED: "已发布",
      DRAFT: "草稿",
      TO_AUDIT: "待审核",
    });
    expect(postStatusOptions).toEqual([
      { label: "已发布", value: "PUBLISHED" },
      { label: "草稿", value: "DRAFT" },
      { label: "待审核", value: "TO_AUDIT" },
    ]);
  });

  it("preserves post type labels and option order", () => {
    expect(PostTypeName).toEqual({
      ARTICLE: "文章",
      MOVIE: "电影",
      PHOTOGRAPH: "画廊",
      QUOTE: "引用",
    });
    expect(postTypeOptions).toEqual([
      { label: "文章", value: "ARTICLE" },
      { label: "电影", value: "MOVIE" },
      { label: "画廊", value: "PHOTOGRAPH" },
      { label: "引用", value: "QUOTE" },
    ]);
  });

  it("preserves user level labels and option order", () => {
    expect(UserLevelName).toEqual({
      ADMIN: "管理员",
      EDITOR: "编辑",
      GUEST: "游客",
    });
    expect(userLevelOptions).toEqual([
      { label: "管理员", value: "ADMIN" },
      { label: "编辑", value: "EDITOR" },
      { label: "游客", value: "GUEST" },
    ]);
  });

  it("preserves the distinct user status option order", () => {
    expect(UserStatusName).toEqual({
      DELETED: "已删除",
      ENABLE: "启用",
      DISABLE: "禁用",
    });
    expect(userStatusOptions).toEqual([
      { label: "已删除", value: "DELETED" },
      { label: "禁用", value: "DISABLE" },
      { label: "启用", value: "ENABLE" },
    ]);
  });

  it("preserves menu type labels", () => {
    expect(MenuTypeName).toEqual({
      CATEGORY: "分类",
      PAGE: "页面",
      CUSTOM: "自定义",
    });
  });

  it("preserves enabled status labels and option order", () => {
    expect(EnableStatusName).toEqual({ ENABLE: "启用", DISABLE: "禁用" });
    expect(enableStatusOptions).toEqual([
      { label: "启用", value: "ENABLE" },
      { label: "禁用", value: "DISABLE" },
    ]);
  });
});
