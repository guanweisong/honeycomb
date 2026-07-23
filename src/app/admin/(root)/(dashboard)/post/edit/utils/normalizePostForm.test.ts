import { describe, expect, it } from "vitest";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";
import { PostType } from "@/packages/trpc/api/modules/post/types/post.type";
import { normalizePostForm } from "./normalizePostForm";

describe("normalizePostForm", () => {
  it.each([PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH])(
    "requires a cover for %s posts",
    (type) => {
      expect(normalizePostForm({ type }, PostStatus.PUBLISHED)).toEqual({
        ok: false,
        reason: "COVER_REQUIRED",
      });
    },
  );

  it("defaults an unspecified type to article", () => {
    expect(
      normalizePostForm({ coverId: "cover-id" }, PostStatus.DRAFT),
    ).toEqual({
      ok: true,
      data: {
        coverId: "cover-id",
        status: PostStatus.DRAFT,
      },
    });
  });

  it("allows quote posts without a cover", () => {
    expect(
      normalizePostForm({ type: PostType.QUOTE }, PostStatus.PUBLISHED),
    ).toEqual({
      ok: true,
      data: {
        type: PostType.QUOTE,
        status: PostStatus.PUBLISHED,
      },
    });
  });

  it.each([
    [PostType.ARTICLE, { title: { zh: "文章" } }],
    [PostType.MOVIE, { movieTime: "2026-07-23" }],
    [
      PostType.PHOTOGRAPH,
      {
        galleryLocation: { zh: "上海" },
        galleryTime: "2026-07-23",
      },
    ],
    [
      PostType.QUOTE,
      { quoteAuthor: { zh: "作者" }, quoteContent: { zh: "引言" } },
    ],
  ])("preserves %s-specific form fields", (type, fields) => {
    const values = {
      type,
      categoryId: "category-id",
      coverId: type === PostType.QUOTE ? undefined : "cover-id",
      ...fields,
    };

    const result = normalizePostForm(values, PostStatus.PUBLISHED);

    expect(result).toEqual({
      ok: true,
      data: { ...values, status: PostStatus.PUBLISHED },
    });
  });

  it("preserves the id in update form data", () => {
    expect(
      normalizePostForm(
        {
          id: "post-id",
          type: PostType.ARTICLE,
          categoryId: "category-id",
          coverId: "cover-id",
        },
        PostStatus.DRAFT,
      ),
    ).toEqual({
      ok: true,
      data: {
        id: "post-id",
        type: PostType.ARTICLE,
        categoryId: "category-id",
        coverId: "cover-id",
        status: PostStatus.DRAFT,
      },
    });
  });
});
