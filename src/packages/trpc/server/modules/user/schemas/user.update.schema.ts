import { UserInsertSchema } from "@/packages/trpc/server/modules/user/schemas/user.insert.schema";
import { IdSchema } from "@/packages/trpc/server/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/server/schemas/clean.zod";

/**
 * 更新用户时的数据验证 schema。
 */
export const UserUpdateSchema = UserInsertSchema.partial().extend({
  id: IdSchema,
});

export type UserUpdate = CleanZod<typeof UserUpdateSchema>;
