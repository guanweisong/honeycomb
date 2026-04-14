import { UserInsertSchema } from "@/packages/trpc/api/modules/user/schemas/user.insert.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新用户时的数据验证 schema。
 */
export const UserUpdateSchema = UserInsertSchema.partial().extend({
  id: IdSchema,
});

export type UserUpdate = CleanZod<typeof UserUpdateSchema>;
