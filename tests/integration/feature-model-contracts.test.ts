// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CommentStatus } from "../../src/features/comment/comment-status";
import { PageTemplate } from "../../src/features/page/page-template";
import { PageStatus } from "../../src/features/page/page-status";
import { PostStatus } from "../../src/features/post/post-status";
import { PostType } from "../../src/features/post/post-type";
import { TagType } from "../../src/features/tag/tag-kind";
import {
  MultiLangEnum,
  normalizeMultiLangLocale,
} from "../../src/lib/i18n/multi-lang";
import { MenuType } from "../../src/features/menu/menu-types";
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
