import { describe, expect, it } from "vitest";
import { CommentInsertSchema } from "./comment.insert.schema";

describe("CommentInsertSchema", () => {
  const validComment = {
    author: "Test User",
    content: "New comment",
    email: "test@example.com",
    captchaToken: "valid-captcha",
  };

  it("requires exactly one comment target", () => {
    expect(CommentInsertSchema.safeParse(validComment).success).toBe(false);
    expect(
      CommentInsertSchema.safeParse({
        ...validComment,
        postId: "post-id",
        pageId: "page-id",
      }).success,
    ).toBe(false);
    expect(
      CommentInsertSchema.safeParse({
        ...validComment,
        postId: "post-id",
      }).success,
    ).toBe(true);
  });

  it.each([
    ["site", "javascript:alert(1)"],
    ["email", "not-an-email"],
  ])("rejects invalid %s on an otherwise valid target", (field, value) => {
    const input = {
      ...validComment,
      postId: "post-id",
      site: "https://example.com",
    };
    expect(CommentInsertSchema.safeParse(input).success).toBe(true);
    const result = CommentInsertSchema.safeParse({ ...input, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([[field]]);
    }
  });
});
