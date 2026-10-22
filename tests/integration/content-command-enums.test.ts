// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { PageTemplate } from "@/features/page/types/page.template";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";

describe("content command enum schemas", () => {
  const post = {
    categoryId: "category-1",
    creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
    status: "PUBLISHED",
    type: "ARTICLE",
    commentStatus: "ENABLE",
  };

  const page = {
    title: { en: "About", zh: "关于" },
    content: { en: "Content", zh: "内容" },
    creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
    status: "PUBLISHED",
    template: PageTemplate.DEFAULT,
  };

  it("accepts the otherwise-valid post and page baselines", () => {
    expect(PostInsertSchema.safeParse(post).success).toBe(true);
    expect(PageInsertSchema.safeParse(page).success).toBe(true);
  });
});
