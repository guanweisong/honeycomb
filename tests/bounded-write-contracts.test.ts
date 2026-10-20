import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it } from "vitest";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import { queryString } from "@/lib/validation/query.string.schema";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { CategoryUpdateSchema } from "@/features/category/schema";
import { TagUpdateSchema } from "@/features/tag/schema";
import { PostUpdateSchema, PostTagUpdateSchema } from "@/features/post/schema";
import { PageUpdateSchema } from "@/features/page/schema";
import { LinkUpdateSchema } from "@/features/link/schema";
import { UserUpdateSchema } from "@/features/user/schema";
import { SettingAdminUpdateSchema as SettingUpdateSchema } from "@/features/setting/schema";
import { MenuWriteSchema as MenuUpdateSchema } from "@/features/menu/schema";
import { saveAllMenus } from "@/features/menu/server";
import { PostListQuerySchema } from "@/features/post/schema";
import { TagListQuerySchema } from "@/features/tag/schema";

describe("bounded write contracts", () => {
  it("bounds page sizes, search text and destructive batches", () => {
    expect(PaginationQuerySchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(PaginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ page: 1.5 }).success).toBe(false);
    expect(queryString().safeParse("x".repeat(201)).success).toBe(false);
    expect(queryString().parse(" x ")).toBe("x");
    const ids = Array.from({ length: 101 }, (_, i) =>
      String(i).padStart(24, "0"),
    );
    expect(DeleteBatchSchema.safeParse({ ids }).success).toBe(false);
    expect(
      DeleteBatchSchema.safeParse({ ids: ids.slice(0, 100) }).success,
    ).toBe(true);
  });
  it.each([
    CategoryUpdateSchema,
    TagUpdateSchema,
    PostUpdateSchema,
    PageUpdateSchema,
    LinkUpdateSchema,
    UserUpdateSchema,
    SettingUpdateSchema,
  ])("rejects id-only and undefined-only updates", (schema) => {
    expect(schema.safeParse({ id: "a".repeat(24) }).success).toBe(false);
    expect(
      schema.safeParse({
        id: "a".repeat(24),
        title: undefined,
        name: undefined,
      }).success,
    ).toBe(false);
  });
  it("rejects implicit menu clearing at both entry points", async () => {
    expect(MenuUpdateSchema.safeParse([]).success).toBe(false);
    const invalidator = {
      invalidate: async () => ({ state: "completed" as const }),
    };
    await expect(
      saveAllMenus(asMockDatabase(createMockDb()), [], invalidator),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("bounds tag replacement before normalization while permitting explicit clearing", () => {
    const input = { postId: "a".repeat(24), type: "ACTOR" };
    expect(
      PostTagUpdateSchema.safeParse({
        ...input,
        tagIds: Array(101).fill("b".repeat(24)),
      }).success,
    ).toBe(false);
    expect(
      PostTagUpdateSchema.parse({
        ...input,
        tagIds: ["b".repeat(24), "b".repeat(24)],
      }).tagIds,
    ).toEqual(["b".repeat(24)]);
    expect(
      PostTagUpdateSchema.safeParse({ ...input, tagIds: [] }).success,
    ).toBe(true);
  });
  it("bounds strings inside query arrays and tag lookup batches", () => {
    expect(
      PostListQuerySchema.safeParse({ status: ["x".repeat(201)] }).success,
    ).toBe(false);
    expect(
      TagListQuerySchema.safeParse({ id: Array(101).fill("a".repeat(24)) })
        .success,
    ).toBe(false);
  });
});
