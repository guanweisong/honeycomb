import { describe, expect, it } from "vitest";
import { TagListQuerySchema } from "@/features/tag/schemas/tag.list.schema";

describe("bounded write contracts", () => {
  it("bounds tag lookup batches", () => {
    expect(
      TagListQuerySchema.safeParse({ id: Array(101).fill("a".repeat(24)) })
        .success,
    ).toBe(false);
  });
});
