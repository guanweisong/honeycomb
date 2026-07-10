import { describe, expect, it } from "vitest";
import { CommentInsertSchema } from "./comment.insert.schema";

describe("CommentInsertSchema", () => {
  it("should reject unsafe comment site URLs", () => {
    const result = CommentInsertSchema.safeParse({
      author: "Test User",
      content: "New comment",
      email: "test@example.com",
      captchaToken: "valid-captcha",
      site: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
  });

  it("should reject invalid comment email addresses", () => {
    const result = CommentInsertSchema.safeParse({
      author: "Test User",
      content: "New comment",
      email: "not-an-email",
      captchaToken: "valid-captcha",
      site: "https://example.com",
    });

    expect(result.success).toBe(false);
  });
});
