import { describe, expect, it } from "vitest";

import { PostType } from "@/features/post/types/post.type";
import { PostStatus } from "@/features/post/types/post.status";
import { EnableStatus } from "@/lib/validation/enable-status";
import { toPostInsertValues, toPostUpdateValues } from "./post-transforms";

describe("post command transforms", () => {
  it("maps only scalar parent fields on create", () => {
    const values = toPostInsertValues(
      {
        categoryId: "category-1",
        title: { en: "Title", zh: "标题" },
        content: { en: "<p>Safe</p><script>x</script>", zh: "<p>安全</p>" },
        excerpt: { en: "Excerpt", zh: "摘要" },
        status: PostStatus.DRAFT,
        type: PostType.ARTICLE,
        coverId: null,
        commentStatus: EnableStatus.ENABLE,
        quoteAuthor: null,
        quoteContent: null,
        movieTime: null,
        galleryLocation: { en: "Shanghai", zh: "上海" },
        galleryTime: null,
      },
      "author-1",
    );

    expect(values).toEqual({
      authorId: "author-1",
      categoryId: "category-1",
      status: PostStatus.DRAFT,
      type: PostType.ARTICLE,
      coverId: null,
      commentStatus: EnableStatus.ENABLE,
      movieTime: null,
      galleryTime: null,
    });
  });

  it("does not emit fields omitted from an update", () => {
    expect(toPostUpdateValues({ title: { zh: "标题" } })).toEqual({});
  });
});
