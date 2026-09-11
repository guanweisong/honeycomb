import { describe, expect, it } from "vitest";
import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";
import { TagUpdateSchema } from "@/features/tag/schemas/tag.update.schema";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";
import { PageUpdateSchema } from "@/features/page/schemas/page.update.schema";
import { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import { UserUpdateSchema } from "@/features/user/schemas/user.update.schema";
import { SettingUpdateSchema } from "@/features/setting/schemas/setting.update.schema";
import { MenuUpdateSchema } from "@/features/menu/schemas/menu.update.schema";
import { saveAllMenus } from "@/features/menu/application/menu-use-cases";
import { PostTagUpdateSchema } from "@/features/post/application/write-schema";
import { PostListQuerySchema } from "@/features/post/schemas/post.list.query.schema";
import { TagListQuerySchema } from "@/features/tag/schemas/tag.list.query.schema";

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
      invalidate: async () => {},
      invalidateAll: async () => {},
    };
    await expect(
      saveAllMenus(
        {
          saveAll: async () => {
            throw new Error("must not write");
          },
        },
        [],
        invalidator,
      ),
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
