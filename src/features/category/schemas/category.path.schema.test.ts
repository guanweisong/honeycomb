// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CategoryInsertSchema } from "@/features/category/schemas/category.insert.schema";
import { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";

describe("category path writes", () => {
  const title = { en: "Notes", zh: "笔记" };
  const id = "507f1f77bcf86cd799439011";

  it.each(["a/b", "a\\b", "notes?new", "tag#latest", ".", "..", "%2f", "a b"])(
    "rejects a path that is not a single slug (%s)",
    (path) => {
      expect(
        CategoryInsertSchema.safeParse({ title, description: title, path })
          .success,
      ).toBe(false);
      expect(CategoryUpdateSchema.safeParse({ id, path }).success).toBe(false);
    },
  );

  it("allows localized slugs and updates that omit the legacy path", () => {
    expect(CategoryUpdateSchema.parse({ id, path: "  笔记-2026  " }).path).toBe(
      "笔记-2026",
    );
    expect(CategoryUpdateSchema.safeParse({ id, title }).success).toBe(true);
  });
});
