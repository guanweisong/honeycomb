import { describe, expect, it } from "vitest";
import { CommentStatus, commentStatusOptions } from "./content/comment";
import { PageTemplate, pageTemplateOptions } from "./content/page-template";
import { PageStatus, pageStatusOptions } from "./content/page";
import { PostStatus, postStatusOptions } from "./content/post-status";
import { PostType, postTypeOptions } from "./content/post";
import { TagType } from "./content/tag";
import { MultiLangEnum } from "./localization/multi-lang";
import { MenuType } from "./navigation/menu";
import { EnableStatus, enableStatusOptions } from "./shared/enable-status";

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

  it("preserves display option values", () => {
    expect(commentStatusOptions.map((option) => option.value)).toEqual(
      Object.values(CommentStatus),
    );
    expect(pageStatusOptions.map((option) => option.value)).toEqual(
      Object.values(PageStatus),
    );
    expect(pageTemplateOptions.map((option) => option.value)).toEqual(
      Object.values(PageTemplate),
    );
    expect(postStatusOptions.map((option) => option.value)).toEqual(
      Object.values(PostStatus),
    );
    expect(postTypeOptions.map((option) => option.value)).toEqual(
      Object.values(PostType),
    );
    expect(enableStatusOptions.map((option) => option.value)).toEqual(
      Object.values(EnableStatus),
    );
  });
});
