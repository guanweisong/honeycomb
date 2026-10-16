// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CommentStatus } from "./content/comment";
import { PageTemplate } from "./content/page-template";
import { PageStatus } from "./content/page";
import { PostStatus } from "./content/post-status";
import { PostType } from "./content/post";
import { TagType } from "./content/tag";
import {
  MultiLangEnum,
  normalizeMultiLangLocale,
} from "./localization/multi-lang";
import { MenuType } from "./navigation/menu";
import { EnableStatus } from "./shared/enable-status";

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
