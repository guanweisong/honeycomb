import { describe, expect, it } from "vitest";

import { PageInsertSchema } from "@/features/page/schema";
import { PageTemplate } from "@/features/page/page-template";
import { PostInsertSchema } from "./schema";

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

import { PostUpdateSchema } from "./schema";
describe("atomic post input", () => {
  it("requires a durable creation token", () => {
    expect(PostInsertSchema.safeParse({ categoryId: "category" }).success).toBe(
      false,
    );
  });
  it("requires an explicit editor baseline", () => {
    expect(
      PostUpdateSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
        title: { en: "new" },
      }).success,
    ).toBe(false);
  });
  it("does not count the expected version as an edit", () => {
    expect(
      PostUpdateSchema.safeParse({
        id: "507f1f77bcf86cd799439011",
        expectedVersion: 0,
      }).success,
    ).toBe(false);
  });
  it("retains explicit relation clears", () => {
    const result = PostUpdateSchema.parse({
      id: "507f1f77bcf86cd799439011",
      expectedVersion: 0,
      movieActorIds: [],
    });
    expect(result).toHaveProperty("movieActorIds", []);
  });
});
