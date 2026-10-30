// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostStatusName } from "@/features/post/types/post.status-name";
import { postStatusOptions, postTypeOptions } from "@/app/admin/(dashboard)/post/options";
import { PostTypeName } from "@/features/post/types/post.type-name";

describe("post display options", () => {
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
});
