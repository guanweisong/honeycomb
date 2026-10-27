import { describe, expect, it } from "vitest";

import { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";
import { TagUpdateSchema } from "@/features/tag/schemas/tag.update.schema";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";
import { PageUpdateSchema } from "@/features/page/schemas/page.update.schema";
import { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import { UserUpdateSchema } from "@/features/user/schemas/user.write.schema";
import { SettingAdminUpdateSchema as SettingUpdateSchema } from "@/features/setting/schemas/setting.admin-update.schema";

describe("bounded write contracts", () => {
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
        expectedVersion: 0,
        title: undefined,
        name: undefined,
      }).success,
    ).toBe(false);
  });
});
