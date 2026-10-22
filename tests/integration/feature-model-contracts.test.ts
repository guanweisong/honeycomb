// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { PageStatus } from "@/features/page/types/page.status";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { TagType } from "@/features/tag/types/tag.type";
import {
  MultiLangEnum,
  normalizeMultiLangLocale,
} from "../../src/lib/i18n/multi-lang";
import { MenuType } from "@/features/menu/types/menu.type";
import { EnableStatus } from "../../src/lib/validation/enable-status";

describe("domain contracts", () => {
  it("preserves stable content, navigation, localization, and status values", () => {
    expect(Object.values(CommentStatus)).toEqual([
      "TO_AUDIT",
      "PUBLISH",
      "RUBBISH",
      "BAN",
    ]);
    expect(Object.values(PageStatus)).toEqual([
      "PUBLISHED",
      "DRAFT",
      "TO_AUDIT",
    ]);
    expect(Object.values(PageTemplate)).toEqual(["default", "friendly-links"]);
    expect(Object.values(PostStatus)).toEqual([
      "PUBLISHED",
      "DRAFT",
      "TO_AUDIT",
    ]);
    expect(Object.values(PostType)).toEqual([
      "ARTICLE",
      "MOVIE",
      "PHOTOGRAPH",
      "QUOTE",
    ]);
    expect(Object.values(TagType)).toEqual([
      "ACTOR",
      "DIRECTOR",
      "MOVIE_STYLE",
      "GALLERY_STYLE",
    ]);
    expect(Object.values(MenuType)).toEqual(["CATEGORY", "PAGE", "CUSTOM"]);
    expect(Object.values(MultiLangEnum)).toEqual(["zh", "en"]);
    expect(Object.values(EnableStatus)).toEqual(["ENABLE", "DISABLE"]);
  });

  it("normalizes external locale strings to a supported language key", () => {
    expect(normalizeMultiLangLocale("zh")).toBe(MultiLangEnum.Zh);
    expect(normalizeMultiLangLocale("en")).toBe(MultiLangEnum.En);
    expect(normalizeMultiLangLocale("unsupported")).toBe(MultiLangEnum.En);
  });
});
