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
