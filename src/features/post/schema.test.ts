import { describe, expect, it } from "vitest";

import { PageInsertSchema } from "@/features/page/schema";
import { PageTemplate } from "@/features/page/page-template";
import { PostDeleteSchema, PostInsertSchema } from "./schema";

describe("content command enum schemas", () => {
  const post = {
    categoryId: "category-1",
    creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
    status: "PUBLISHED",
    type: "ARTICLE",
    commentStatus: "ENABLE",
  };
  const page = {
    title: { en: "About", zh: "关于" },
    content: { en: "Content", zh: "内容" },
    creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
    status: "PUBLISHED",
    template: PageTemplate.DEFAULT,
  };

  it("accepts the otherwise-valid post and page baselines", () => {
    expect(PostInsertSchema.safeParse(post).success).toBe(true);
    expect(PageInsertSchema.safeParse(page).success).toBe(true);
  });

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

  it.each([
    ["status", "VISIBLE"],
    ["template", "UNKNOWN"],
  ])("rejects only the invalid page %s", (field, value) => {
    const result = PageInsertSchema.safeParse({ ...page, [field]: value });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected enum rejection");
    expect(result.error.issues.map((issue) => issue.path)).toEqual([[field]]);
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

describe("explicit post translation patch", () => {
  const base = { id: "507f1f77bcf86cd799439011", expectedVersion: 0 };
  it("accepts explicit locale removal without requiring translated values", () => {
    expect(
      PostUpdateSchema.parse({ ...base, removeLocales: ["en"] }),
    ).toHaveProperty("removeLocales", ["en"]);
  });
  it.each([
    { title: { en: "changed" } },
    { content: { en: null } },
    { title: null },
  ])("rejects simultaneous modification and removal: %j", (patch) => {
    expect(
      PostUpdateSchema.safeParse({ ...base, ...patch, removeLocales: ["en"] })
        .success,
    ).toBe(false);
  });
  it("allows editing another locale while removing one", () => {
    expect(
      PostUpdateSchema.parse({
        ...base,
        title: { zh: "保留" },
        removeLocales: ["en"],
      }),
    ).toHaveProperty("removeLocales", ["en"]);
  });
  it.each([
    { views: 1 },
    { authorId: "someone" },
    { title: { en: "value", fr: "unsupported" } },
    { removeLocales: ["fr"] },
    { removeLocales: ["en", "en"] },
  ])("rejects unsupported or server-owned update input: %j", (patch) => {
    expect(
      PostUpdateSchema.safeParse({ ...base, movieTime: "edit", ...patch })
        .success,
    ).toBe(false);
  });
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

describe("strict post delete input", () => {
  const item = { id: "507f1f77bcf86cd799439011", expectedVersion: 0 };
  it.each([
    { items: [item], force: true },
    { items: [{ ...item, authorId: "forged" }] },
  ])("rejects unsupported fields: %j", (input) => {
    expect(PostDeleteSchema.safeParse(input).success).toBe(false);
  });
});
