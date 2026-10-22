// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostDeleteSchema } from "@/features/post/schemas/post.delete.schema";

describe("strict post delete input", () => {
  const item = { id: "507f1f77bcf86cd799439011", expectedVersion: 0 };

  it.each([
    { items: [item], force: true },
    { items: [{ ...item, authorId: "forged" }] },
  ])("rejects unsupported fields: %j", (input) => {
    expect(PostDeleteSchema.safeParse(input).success).toBe(false);
  });
});
