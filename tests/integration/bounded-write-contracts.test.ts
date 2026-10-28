import { describe, expect, it } from "vitest";

import { CategoryUpdateSchema } from "@/features/category/schemas/category.update.schema";
import { TagUpdateSchema } from "@/features/tag/schemas/tag.update.schema";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";
import { PageUpdateSchema } from "@/features/page/schemas/page.update.schema";
import { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import { UserUpdateSchema } from "@/features/user/schemas/user.write.schema";
import { SettingAdminUpdateSchema } from "@/features/setting/schemas/setting.admin-update.schema";
import { SettingPatchSchema } from "@/features/setting/schemas/setting.patch.schema";

const id = "a".repeat(24);
const localized = { en: "Changed", zh: "变更" };

describe("bounded write contracts", () => {
  it.each([
    {
      name: "category",
      schema: CategoryUpdateSchema,
      base: { id },
      patch: { title: localized },
    },
    {
      name: "tag",
      schema: TagUpdateSchema,
      base: { id },
      patch: { name: localized },
    },
    {
      name: "post",
      schema: PostUpdateSchema,
      base: { id, expectedVersion: 0 },
      patch: { title: localized },
    },
    {
      name: "page",
      schema: PageUpdateSchema,
      base: { id, expectedVersion: 0 },
      patch: { title: localized },
    },
    {
      name: "link",
      schema: LinkUpdateSchema,
      base: { id },
      patch: { name: "Changed" },
    },
    {
      name: "user",
      schema: UserUpdateSchema,
      base: { id },
      patch: { name: "changed-user" },
    },
    {
      name: "setting patch",
      schema: SettingPatchSchema,
      base: { id, expectedVersion: 0 },
      patch: { siteName: localized },
    },
  ])(
    "$name rejects only the missing writable fields",
    ({ schema, base, patch }) => {
      expect(schema.safeParse({ ...base, ...patch }).success).toBe(true);
      const undefinedPatch = Object.fromEntries(
        Object.keys(patch).map((key) => [key, undefined]),
      );
      for (const input of [base, { ...base, ...undefinedPatch }]) {
        const result = schema.safeParse(input);
        expect(result.success).toBe(false);
        if (result.success)
          throw new Error("Empty patch unexpectedly accepted");
        expect(result.error.issues).toEqual([
          expect.objectContaining({
            code: "custom",
            message: "至少修改一个字段",
            path: [],
          }),
        ]);
      }
    },
  );

  it("validates the complete setting form separately from persistence patches", () => {
    const complete = {
      id,
      expectedVersion: 0,
      siteName: {},
      siteSubName: {},
      siteCopyright: {},
      siteSignature: {},
    };
    expect(SettingAdminUpdateSchema.safeParse(complete).success).toBe(true);
    for (const field of [
      "siteName",
      "siteSubName",
      "siteCopyright",
      "siteSignature",
    ] as const) {
      const result = SettingAdminUpdateSchema.safeParse({
        ...complete,
        [field]: undefined,
      });
      expect(result.success).toBe(false);
      if (result.success)
        throw new Error("Incomplete setting form unexpectedly accepted");
      expect(result.error.issues.map((issue) => issue.path)).toEqual([[field]]);
    }
  });
});
