import { describe, expect, it } from "vitest";
import { PostListQuerySchema } from "@/features/post/schemas/post.list-query.schema";

describe("bounded write contracts", () => {
  it("bounds strings inside post query arrays", () => {
    expect(
      PostListQuerySchema.safeParse({ status: ["x".repeat(201)] }).success,
    ).toBe(false);
  });
});
