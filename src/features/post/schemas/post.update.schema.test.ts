// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";

describe("atomic post input", () => {
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
});

describe("bounded write contracts", () => {
  it("bounds tag replacement before normalization while permitting explicit clearing", () => {
    const input = { id: "a".repeat(24), expectedVersion: 0 };
    expect(
      PostUpdateSchema.safeParse({
        ...input,
        movieActorIds: Array(101).fill("b".repeat(24)),
      }).success,
    ).toBe(false);
    expect(
      PostUpdateSchema.parse({
        ...input,
        movieActorIds: ["b".repeat(24), "b".repeat(24)],
      }).movieActorIds,
    ).toEqual(["b".repeat(24)]);
    expect(
      PostUpdateSchema.safeParse({ ...input, movieActorIds: [] }).success,
    ).toBe(true);
  });
});
