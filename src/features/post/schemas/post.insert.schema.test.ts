// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";

describe("content command enum schemas", () => {
  const post = {
    categoryId: "category-1",
    creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
    status: "PUBLISHED",
    type: "ARTICLE",
    commentStatus: "ENABLE",
  };

  it.each([
    ["status", "PUBLISH"],
    ["type", "ESSAY"],
    ["commentStatus", "YES"],
  ])("rejects only the invalid post %s", (field, value) => {
    const result = PostInsertSchema.safeParse({ ...post, [field]: value });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected enum rejection");
    expect(result.error.issues.map((issue) => issue.path)).toEqual([[field]]);
  });

  it("accepts the otherwise-valid post baseline", () => {
    expect(PostInsertSchema.safeParse(post).success).toBe(true);
  });
});

describe("atomic post input", () => {
  it("requires a durable creation token", () => {
    expect(PostInsertSchema.safeParse({ categoryId: "category" }).success).toBe(
      false,
    );
  });
});

describe("explicit post translation patch", () => {
  it("rejects server-owned create fields rather than stripping them", () => {
    expect(
      PostInsertSchema.safeParse({
        categoryId: "category",
        creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
        views: 1,
      }).success,
    ).toBe(false);
  });
});

describe("唯一写入契约及边界行为", () => {
  it("文章保留可空局部语言并规范化分类 ID", () => {
    expect(
      PostInsertSchema.parse({
        creationToken: "11111111-1111-4111-8111-111111111111",
        categoryId: " category ",
        title: { en: null },
        coverId: null,
      }),
    ).toEqual({
      creationToken: "11111111-1111-4111-8111-111111111111",
      categoryId: "category",
      title: { en: null },
      coverId: null,
    });
    expect(
      PostInsertSchema.safeParse({
        creationToken: "11111111-1111-4111-8111-111111111111",
        categoryId: " ",
      }).success,
    ).toBe(false);
  });
});
