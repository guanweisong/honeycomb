import { describe, expect, it } from "vitest";

import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { PostInsertSchema } from "./post.insert.schema";

describe("content command enum schemas", () => {
  it("rejects unknown post enum values", () => {
    const result = PostInsertSchema.safeParse({
      categoryId: "category-1",
      status: "PUBLISH",
      type: "ESSAY",
      commentStatus: "YES",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown page status values", () => {
    const result = PageInsertSchema.safeParse({
      title: { en: "About", zh: "关于" },
      content: { en: "Content", zh: "内容" },
      status: "VISIBLE",
      template: PageTemplate.DEFAULT,
    });

    expect(result.success).toBe(false);
  });
});
